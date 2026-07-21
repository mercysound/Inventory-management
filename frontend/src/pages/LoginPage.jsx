// src/pages/LoginPage.jsx
// Standalone login + register page at /login.
// ?mode=register opens the Sign Up tab directly.
// Blocks login/register when maintenance mode is ON.

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  ChevronRight, Eye, EyeOff, Loader2, ShoppingCart,
  Wrench, ArrowLeft,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import { useMaintenance } from "../hooks/useMaintenance";

const GUEST_CART_KEY = "melech_guest_cart";

// Fix admin/staff login: skip cart sync — admin has no cart, just clear guest data
const syncGuestCartToServer = async (guestCart, userRole) => {
  if (!guestCart || guestCart.length === 0) return 0;
  // Admin and staff don't have a customer cart — just clear localStorage silently
  if (userRole === "admin" || userRole === "staff") {
    localStorage.removeItem(GUEST_CART_KEY);
    return 0;
  }
  try {
    let synced = 0;
    for (const item of guestCart) {
      await axiosInstance.put(`/orders/qty/${item.productId}`, {
        quantity:  item.quantity,
        price:     item.price,
        priceMode: "retail",
      });
      synced++;
    }
    localStorage.removeItem(GUEST_CART_KEY);
    return synced;
  } catch {
    return 0;
  }
};

const dashboardByRole = (role) => {
  if (role === "admin")     return "/admin-dashboard";
  if (role === "staff")     return "/customer-dashboard";
  if (role === "wholesale") return "/wholesale-dashboard";
  return "/user-dashboard";
};

// After login, resolve where to navigate:
// Priority: 1. ?redirect= (from protected route)  2. ?ref=cart  3. incomplete profile  4. role dashboard
const resolvePostLoginPath = (role, searchParams, user) => {
  const redirect = searchParams.get("redirect");
  if (redirect && redirect.startsWith("/")) {
    return decodeURIComponent(redirect);
  }
  const ref = searchParams.get("ref");
  if (ref === "cart") {
    // Admin/staff don't use the customer cart — send them to their dashboard
    if (role === "admin")  return "/admin-dashboard";
    if (role === "staff")  return "/customer-dashboard/orders";
    return cartPathByRole(role);
  }
  // Incomplete profile check (only for customer/wholesale — not admin/staff)
  if (role !== "admin" && role !== "staff") {
    if (!user?.phone || !user?.address) return "/complete-profile";
  }
  return dashboardByRole(role);
};

const cartPathByRole = (role) => {
  if (role === "wholesale") return "/wholesale-dashboard/orders";
  if (role === "staff")     return "/customer-dashboard/orders";
  return "/user-dashboard/orders";
};

const Field = ({ label, error, children }) => (
  <div className="space-y-1">
    {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide pl-0.5">{label}</label>}
    {children}
    <AnimatePresence>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          className="text-xs text-red-500 pl-0.5">{error}</motion.p>
      )}
    </AnimatePresence>
  </div>
);

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white transition-all";

const LoginPage = () => {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const { login }         = useAuth();
  const [isLogin, setIsLogin]             = useState(searchParams.get("mode") !== "register");
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors]               = useState({});
  const [maintenance, setMaintenance]     = useState(null);

  // Show guest cart reminder banner
  const guestCartCount = (() => {
    try {
      const cart = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
      return cart.reduce((s, i) => s + i.quantity, 0);
    } catch { return 0; }
  })();

  const [formData, setFormData] = useState({
    name: "", email: localStorage.getItem("pos-last-email") || "",
    password: "", address: "", phone: "",
  });

  // ── Maintenance SSE ───────────────────────────────────────────────────────
  useMaintenance({
    onMaintenance:     (msg) => setMaintenance(msg),
    onMaintenanceEnded: ()  => setMaintenance(null),
  });

  // Check current maintenance status on load
  useEffect(() => {
    axiosInstance.get("/settings/maintenance-status").then(res => {
      if (res.data.maintenanceMode) setMaintenance(res.data.maintenanceModeMessage);
    }).catch(() => {});
  }, []);

  // Redirect logged-in users
  useEffect(() => {
    const token = localStorage.getItem("pos-token");
    const userData = localStorage.getItem("pos-user");
    if (token && userData) {
      try {
        const u = JSON.parse(userData);
        // Respect ?redirect= so email links work even when already logged in
        const redirect = searchParams.get("redirect");
        if (redirect && redirect.startsWith("/")) {
          navigate(decodeURIComponent(redirect), { replace: true });
        } else {
          navigate(dashboardByRole(u.role), { replace: true });
        }
      } catch {}
    }
  }, [navigate, searchParams]);

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const validateField = (name, value) => {
    const v = value.trim();
    switch (name) {
      case "name":     return !v ? "Full name is required" : v.length < 3 ? "At least 3 characters" : !v.split(" ").filter(Boolean)[1] ? "Enter first and last name" : "";
      case "email":    return !v ? "Email is required" : !/^[^@]+@[^@]+\.[a-zA-Z]{2,}$/.test(v) ? "Enter a valid email" : "";
      case "password": return !v ? "Password is required" : v.length < 8 ? "At least 8 characters" : "";
      case "phone":    return !v ? "Phone is required" : v.replace(/\D/g, "").length < 10 ? "At least 10 digits" : "";
      case "address":  return !v ? "Address is required" : v.length < 10 ? "At least 10 characters" : "";
      default: return "";
    }
  };

  const validate = () => {
    const fields = isLogin ? ["email", "password"] : ["name", "email", "phone", "address", "password"];
    const errs = {};
    fields.forEach(f => { const e = validateField(f, formData[f] || ""); if (e) errs[f] = e; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (maintenance) { toast.error("Login is disabled during maintenance"); return; }
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        const res = await axiosInstance.post("/auth/login", { email: formData.email, password: formData.password });
        if (res.data.success) {
          const guestCart = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]").filter(i => i.name && typeof i.price === "number");
          await login(res.data.user, res.data.token);
          const role = res.data.user.role;
          const synced = await syncGuestCartToServer(guestCart, role);
          if (role === "admin" || role === "staff") {
            toast.success("Welcome back!");
          } else if (synced > 0) {
            toast.success(`Welcome back! ${synced} cart item${synced !== 1 ? "s" : ""} saved to your cart 🛒`);
          } else {
            toast.success("Welcome back!");
          }
          navigate(resolvePostLoginPath(role, searchParams, res.data.user));
        } else { toast.error(res.data.message || "Login failed"); }
      } else {
        const res = await axiosInstance.post("/users/register", formData);
        if (res.data.success && res.data.token) {
          const guestCart = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]").filter(i => i.name && typeof i.price === "number");
          await login(res.data.user, res.data.token);
          const role = res.data.user.role;
          const synced = await syncGuestCartToServer(guestCart, role);
          if (synced > 0) {
            toast.success(`Account created! ${synced} cart item${synced !== 1 ? "s" : ""} saved 🛒`);
          } else {
            toast.success("Account created — welcome!");
          }
          navigate(resolvePostLoginPath(role, searchParams, res.data.user));
        } else {
          toast.success(res.data.message || "Account created! Please log in.");
          setIsLogin(true);
          setFormData(p => ({ ...p, name: "", address: "", phone: "", password: "" }));
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || (err?.request ? "No response from server." : "An error occurred."));
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (cred) => {
    if (maintenance) { toast.error("Login is disabled during maintenance"); return; }
    setGoogleLoading(true);
    try {
      const res = await axiosInstance.post("/auth/google-login", { tokenId: cred.credential });
      if (!res.data.success) { toast.error(res.data.message || "Google login failed"); return; }
      const guestCart = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]").filter(i => i.name && typeof i.price === "number");
      await login(res.data.user, res.data.token);
      const role = res.data.user.role;
      const synced = await syncGuestCartToServer(guestCart, role);
      if (role === "admin" || role === "staff") {
        toast.success("Signed in with Google!");
      } else if (synced > 0) {
        toast.success(`Signed in! ${synced} cart item${synced !== 1 ? "s" : ""} saved 🛒`);
      } else {
        toast.success("Signed in with Google!");
      }
      navigate(resolvePostLoginPath(role, searchParams, res.data.user));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Google sign-in failed.");
    } finally { setGoogleLoading(false); }
  };

  const switchMode = () => {
    setIsLogin(p => !p); setErrors({}); setShowPassword(false);
    setFormData(p => ({ ...p, name: "", address: "", phone: "", password: "" }));
  };

  // ── Maintenance screen ────────────────────────────────────────────────────
  if (maintenance) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4 gap-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Wrench size={28} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Under Maintenance</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">{maintenance}</p>
          <p className="text-xs text-gray-400">Login is temporarily unavailable. Please check back soon.</p>
        </div>
        <Link to="/" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition">
          <ArrowLeft size={14} /> Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center px-4 py-10">
      {/* Back to shop */}
      <Link to="/" className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-300 text-sm mb-6 transition">
        <ArrowLeft size={14} /> Back to shop
      </Link>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
          <ShoppingCart size={17} className="text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">
          Melech<span className="text-indigo-400"> Hub</span>
        </span>
      </div>

      {/* Cart reminder banner */}
      {guestCartCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mb-4 bg-green-500/90 backdrop-blur text-white
            rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
          <ShoppingCart size={18} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">You have {guestCartCount} item{guestCartCount !== 1 ? "s" : ""} in your cart</p>
            <p className="text-xs text-green-100 mt-0.5">Sign in or create an account to complete your order</p>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-7 md:p-9">

        {/* Tab switcher */}
        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-7">
          {["Sign In", "Sign Up"].map((label, i) => {
            const active = isLogin ? i === 0 : i === 1;
            return (
              <button key={label} onClick={() => { if (!active) switchMode(); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-300"
                }`}>{label}</button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div key="signup" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="space-y-4 overflow-hidden">
                <Field label="Full Name" error={errors.name}>
                  <input type="text" name="name" placeholder="First and Last name"
                    value={formData.name} onChange={handleChange}
                    className={`${inputCls} ${errors.name ? "border-red-400 focus:ring-red-400" : ""}`} />
                </Field>
                <Field label="Phone Number" error={errors.phone}>
                  <input type="tel" name="phone" placeholder="e.g. 08012345678"
                    value={formData.phone} onChange={handleChange}
                    className={`${inputCls} ${errors.phone ? "border-red-400 focus:ring-red-400" : ""}`} />
                </Field>
                <Field label="Delivery Address" error={errors.address}>
                  <input type="text" name="address" placeholder="House No, Street, City, State"
                    value={formData.address} onChange={handleChange}
                    className={`${inputCls} ${errors.address ? "border-red-400 focus:ring-red-400" : ""}`} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          <Field label="Email Address" error={errors.email}>
            <input type="email" name="email" placeholder="you@example.com"
              value={formData.email} onChange={handleChange}
              className={`${inputCls} ${errors.email ? "border-red-400 focus:ring-red-400" : ""}`} />
          </Field>

          <Field label="Password" error={errors.password}>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} name="password"
                placeholder={isLogin ? "Your password" : "Min. 8 chars"}
                value={formData.password} onChange={handleChange}
                className={`${inputCls} pr-11 ${errors.password ? "border-red-400 focus:ring-red-400" : ""}`} />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1" tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {isLogin && (
            <div className="text-right -mt-1">
              <button type="button" onClick={() => navigate("/forgot-password")}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                Forgot password?
              </button>
            </div>
          )}

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
              bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
              text-white font-bold text-sm shadow-lg disabled:opacity-50 transition-all mt-2">
            {loading ? <><Loader2 size={16} className="animate-spin" />Processing…</> : <>{isLogin ? "Sign In" : "Create Account"}<ChevronRight size={15} /></>}
          </motion.button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-500 text-xs">or continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="w-full overflow-hidden rounded-xl" style={{ colorScheme: "light" }}>
          {googleLoading ? (
            <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-300 text-sm">
              <Loader2 size={16} className="animate-spin" /> Connecting…
            </div>
          ) : (
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error("Google sign-in failed.")}
              useOneTap={false} theme="outline" size="large"
              text={isLogin ? "signin_with" : "signup_with"} shape="rectangular" width="9999" />
          )}
        </div>

        <p className="mt-5 text-center text-xs text-gray-600 leading-relaxed">
          🏪 Wholesale partners — sign in with your credentials above.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
