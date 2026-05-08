import axios from "axios";
import { toast } from "react-toastify";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Routes that should NEVER trigger the token refresh logic
const AUTH_ROUTES = ["/auth/login", "/auth/refresh", "/users/register", "/auth/google-login"];

const isAuthRoute = (url = "") => AUTH_ROUTES.some((route) => url.includes(route));

// ─── Request Interceptor ───────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("pos-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.status} (${duration}ms)`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";

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
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
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
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    // ─── Let 400 and 401 errors propagate to the caller (e.g. LandingPage handleSubmit)
    // so toast.error("Invalid credentials") fires correctly there
    const message = error.response?.data?.message || error.message;
    if (status !== 400 && status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;