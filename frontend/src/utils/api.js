import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Routes that should NEVER trigger the token refresh logic
const AUTH_ROUTES = ["/auth/login", "/auth/refresh", "/users/register", "/auth/google-login"];

// Routes where 403 errors should be silenced (not shown as toast)
// These endpoints are role-gated and return 403 for non-matching roles — that's expected.
const SILENT_403_ROUTES = [
  "/settings/my-delegation",
  "/settings/my-wholesale",
  "/settings/theme",
];

// Routes that get a longer timeout (heavy queries / cold starts)
const SLOW_ROUTES = ["/dashboard", "/supplier", "/auth/reset-password", "/products", "/orders"];
// Email operations need even longer timeout (includes SMTP connection + retries)
const EMAIL_ROUTES = ["/auth/forgot-password"];

const isAuthRoute = (url = "") => AUTH_ROUTES.some((route) => url.includes(route));
const isSlowRoute = (url = "") => SLOW_ROUTES.some((route) => url.includes(route));
const isEmailRoute = (url = "") => EMAIL_ROUTES.some((route) => url.includes(route));

const NETWORK_ERROR_TOAST_ID = "network-error";

// ── Network error toast deduplication ────────────────────────────────────────
// Multiple concurrent requests can fail simultaneously when offline.
// This flag ensures only ONE network-error toast shows within a 4-second window,
// regardless of how many requests fail at the same time.
let _networkToastActive = false;
const showNetworkToast = (message) => {
  if (_networkToastActive) return;
  _networkToastActive = true;
  toast.error(message, {
    toastId:     NETWORK_ERROR_TOAST_ID,
    autoClose:   6000,
    pauseOnHover: true,
    onClose:     () => { _networkToastActive = false; },
  });
  // Safety reset in case onClose never fires (e.g. toast dismissed programmatically)
  setTimeout(() => { _networkToastActive = false; }, 8000);
};
const isNetworkError = (error) =>
  !error.response &&
  (error.message === "Network Error" || error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout"));

const getApiErrorMessage = (error) => {
  if (!error.response) {
    return "Network issue. Please check your internet connection.";
  }

  if (error.response.status >= 500) {
    return "Server unavailable. Please try again later.";
  }

  return error.response.data?.message || error.message || "Something went wrong. Please try again.";
};

// ─── Request Interceptor ───────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("pos-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Email operations need more time for SMTP connection + retries (max 3 retries)
    if (isEmailRoute(config.url)) {
      config.timeout = 60000; // 60 seconds for email with retries
    } else if (isSlowRoute(config.url)) {
      // Give heavy routes more time before timing out
      config.timeout = 30000; // 30 seconds
    }

    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(error)
);
// ─── Response Interceptor ──────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata?.startTime;
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.status} (${duration}ms)`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";

    // ── Deactivated account — 403 with ACCOUNT_DEACTIVATED code ──────────────
    // Show a clear friendly message, clear the session, and redirect to login.
    // EXCEPTION: if the request was to /orders/complete or /orders/payment,
    // we let it through in authMiddleware (req.accountSuspended = true) so the
    // order is saved and Paystack is not left holding unreconciled money.
    // That means this interceptor will ONLY see ACCOUNT_DEACTIVATED from
    // other endpoints — redirect is always safe here.
    if (status === 403 && error.response?.data?.code === "ACCOUNT_DEACTIVATED") {
      localStorage.removeItem("pos-token");
      localStorage.removeItem("pos-user");
      toast.error(
        "⚠️ Your account has been temporarily suspended. Please contact support.",
        { autoClose: 8000, toastId: "account-deactivated" }
      );
      // Small delay so the toast is visible before redirect
      setTimeout(() => { window.location.href = "/login"; }, 1500);
      return Promise.reject(error);
    }

    // ✅ FIX: Don't attempt refresh for auth routes (login, register, etc.)
    // Previously, a failed login (401) would trigger refresh → fail → window.location.href = "/"
    // which reloaded the page and swallowed the "Invalid credentials" error toast.
    if (status === 401 && !originalRequest._retry && !isAuthRoute(requestUrl)) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("pos-token");

        if (!refreshToken) {
          // No token at all — just reject, let the caller handle it
          throw new Error("No token available");
        }

        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { token: refreshToken }, // ✅ send token in body, matches your refreshToken controller
          { withCredentials: true }
        );

        const { accessToken } = response.data;
        localStorage.setItem("pos-token", accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);

      } catch (refreshError) {
        // Only clear storage and redirect if it was a genuinely expired session
        // (i.e. user was logged in before, not a fresh failed login attempt)
        localStorage.removeItem("pos-token");
        localStorage.removeItem("pos-user");
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // ─── Let 400 and 401 errors propagate to the caller (e.g. LandingPage handleSubmit)
    // so toast.error("Invalid credentials") fires correctly there
    const message = getApiErrorMessage(error);

    if (!isAuthRoute(requestUrl)) {
      if (isNetworkError(error)) {
        showNetworkToast(message);
      } else if (status !== 400 && status !== 401) {
        // Silently ignore expected 403s from role-gated endpoints
        const isSilent403 = status === 403 && SILENT_403_ROUTES.some((r) => requestUrl.includes(r));
        if (!isSilent403) {
          toast.error(message);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;