import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import { GoogleLogin } from "@react-oauth/google";
import {
  Loader2, Eye, EyeOff, ShoppingCart, BarChart3,
  Users, Package, ChevronRight, Shield, Zap, Globe,
} from "lucide-react";

// ── Dashboard path by role ────────────────────────────────────────────────────
const dashboardByRole = (role) => {
  if (role === "admin")     return "/admin-dashboard";
  if (role === "staff")     return "/customer-dashboard";
  if (role === "wholesale") return "/wholesale-dashboard";
  return "/user-dashboard";
};

// ── Floating background orbs ──────────────────────────────────────────────────
const Orb = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
);

// ── Feature chip ──────────────────────────────────────────────────────────────
const Feature = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2 text-indigo-200 text-sm">
    <Icon size={14} className="text-indigo-300 shrink-0" />
    <span>{text}</span>
  </div>
);

// ── Input field component ─────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide pl-0.5">
        {label}
      </label>
    )}
    {children}
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-xs text-red-500 pl-0.5"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 " +
  "focus:border-transparent focus:bg-white transition-all duration-150";

// ── Main component ────────────────────────────────────────────────────────────
const LandingPage = () => {
  const [isLogin,       setIsLogin]       = useState(true);
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors,        setErrors]        = useState({});
  const cardRef = useRef(null);

  // Smooth scroll to the auth card + optionally switch tab
  const scrollToAuth = (mode) => {
    setIsLogin(mode === "login");
    setErrors({});
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Pre-fill email from last session (survives logout)
  const [formData, setFormData] = useState(() => ({
    name:     "",
    email:    localStorage.getItem("pos-last-email") || "",
    password: "",
    address:  "",
    phone:    "",
  }));

  const navigate = useNavigate();
  const { login } = useAuth();

  // Redirect already-logged-in users
  useEffect(() => {
    const token    = localStorage.getItem("pos-token");
    const userData = localStorage.getItem("pos-user");
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        navigate(dashboardByRole(user.role), { replace: true });
      } catch { /* corrupt data — ignore */ }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.email)                              errs.email    = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email    = "Invalid email format";
    if (!formData.password)                           errs.password = "Password is required";
    else if (formData.password.length < 6)            errs.password = "At least 6 characters";
    if (!isLogin) {
      if (!formData.name.trim())    errs.name    = "Full name is required";
      if (!formData.phone.trim())   errs.phone   = "Phone number is required";
      if (!formData.address.trim()) errs.address = "Address is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        const res = await axiosInstance.post("/auth/login", {
          email:    formData.email,
          password: formData.password,
        });
        const { success, message, user, token } = res.data;
        if (success) {
          await login(user, token);
          toast.success("Welcome back!");
          navigate(dashboardByRole(user.role));
        } else {
          toast.error(message || "Login failed");
        }
      } else {
        const res = await axiosInstance.post("/users/register", formData);
        const { success, message, user, token } = res.data;
        if (success && token && user) {
          await login(user, token);
          toast.success("Account created — welcome!");
          navigate(!user.phone || !user.address ? "/complete-profile" : dashboardByRole(user.role));
        } else {
          toast.success(message || "Account created! Please log in.");
          setIsLogin(true);
          setFormData((prev) => ({ ...prev, name: "", address: "", phone: "", password: "" }));
        }
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        (err?.request ? "No response from server. Check your network." : "An unexpected error occurred.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const res = await axiosInstance.post("/auth/google-login", {
        tokenId: credentialResponse.credential,
      });
      const { success, message, user, token } = res.data;
      if (!success) { toast.error(message || "Google login failed"); return; }
      await login(user, token);
      toast.success("Signed in with Google!");
      navigate(!user.phone || !user.address ? "/complete-profile" : dashboardByRole(user.role));
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        (err?.request ? "No response from server." : "Google sign-in failed.")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    setErrors({});
    setShowPassword(false);
    // Keep email when switching — only clear registration-only fields
    setFormData((prev) => ({ ...prev, name: "", address: "", phone: "", password: "" }));
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col overflow-x-hidden">

      {/* ── Background orbs ──────────────────────────────────────────────── */}
      <Orb className="w-[600px] h-[600px] bg-indigo-600 -top-40 -left-32" />
      <Orb className="w-[400px] h-[400px] bg-violet-600 top-1/3 -right-20" />
      <Orb className="w-[300px] h-[300px] bg-blue-500 bottom-10 left-1/4" />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShoppingCart size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Melech<span className="text-indigo-400"> Hub</span>
          </span>
        </div>

        {/* Right side: status pill + CTA buttons */}
        <div className="flex items-center gap-3">
          {/* Status — hidden on very small screens to avoid crowding */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-indigo-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            System Online
          </div>

          {/* Sign In button */}
          <button
            onClick={() => scrollToAuth("login")}
            className="text-sm font-semibold text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-400 px-4 py-2 rounded-xl transition-all duration-200 bg-white/5 hover:bg-white/10"
          >
            Sign In
          </button>

          {/* Sign Up button — accent */}
          <button
            onClick={() => scrollToAuth("signup")}
            className="text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-2 rounded-xl shadow-md shadow-indigo-600/30 transition-all duration-200"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-6 md:px-12 py-10 max-w-7xl mx-auto w-full">

        {/* ── Left: Hero copy ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 max-w-xl text-center lg:text-left"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6"
          >
            <Zap size={11} />
            Real-time Inventory Management
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
            Manage your
            <span className="block bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
              store smarter
            </span>
          </h1>

          <p className="mt-5 text-gray-400 text-base md:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
            Track stock, process orders, manage customers and staff — all from one clean dashboard built for speed.
          </p>

          {/* Feature chips */}
          <div className="mt-8 flex flex-col sm:flex-row lg:flex-col gap-2.5 items-center lg:items-start justify-center lg:justify-start">
            <Feature icon={BarChart3} text="Real-time sales analytics & revenue tracking" />
            <Feature icon={Package}  text="Smart inventory with low-stock alerts" />
            <Feature icon={Users}    text="Multi-role access: Admin, Staff, Customer, Wholesale" />
            <Feature icon={Shield}   text="Secure payments via Paystack integration" />
            <Feature icon={Globe}    text="Accessible from any device, any time" />
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-xs mx-auto lg:mx-0">
            {[
              { label: "Orders",   value: "∞" },
              { label: "Roles",    value: "4" },
              { label: "Uptime",   value: "99%" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center lg:text-left">
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Right: Auth card ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
          ref={cardRef}
        >
          <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-7 md:p-9">

            {/* Tab switcher */}
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-8">
              {["Sign In", "Sign Up"].map((label, i) => {
                const active = isLogin ? i === 0 : i === 1;
                return (
                  <button
                    key={label}
                    onClick={() => { if (active) return; switchMode(); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <Field label="Full Name" error={errors.name}>
                      <input
                        type="text" name="name" placeholder="e.g. John Doe"
                        value={formData.name} onChange={handleChange}
                        className={inputCls}
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="Phone Number" error={errors.phone}>
                      <input
                        type="tel" name="phone" placeholder="e.g. 08012345678"
                        value={formData.phone} onChange={handleChange}
                        className={inputCls}
                        autoComplete="tel"
                      />
                    </Field>
                    <Field label="Address" error={errors.address}>
                      <input
                        type="text" name="address" placeholder="Your delivery address"
                        value={formData.address} onChange={handleChange}
                        className={inputCls}
                        autoComplete="street-address"
                      />
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>

              <Field label="Email Address" error={errors.email}>
                <input
                  type="email" name="email" placeholder="you@example.com"
                  value={formData.email} onChange={handleChange}
                  className={inputCls}
                  autoComplete="email"
                />
              </Field>

              <Field label="Password" error={errors.password}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password" placeholder="Min. 6 characters"
                    value={formData.password} onChange={handleChange}
                    className={`${inputCls} pr-11`}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {/* Forgot password */}
              {isLogin && (
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                  bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                  text-white font-bold text-sm shadow-lg shadow-indigo-600/30
                  disabled:opacity-50 transition-all duration-200 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ChevronRight size={15} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-xs font-medium">or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google button — full-width responsive wrapper */}
            <div className="w-full relative">
              {googleLoading ? (
                <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-300 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Connecting to Google…
                </div>
              ) : (
                <div
                  className="w-full overflow-hidden rounded-xl"
                  style={{ colorScheme: "light" }}
                >
                  {/*
                    GoogleLogin renders an iframe-based button that ignores CSS width.
                    The trick: wrap in a container that clips to full width, and pass
                    a large fixed width so the button always fills the wrapper on all screens.
                    The outer div's overflow:hidden clips any overflow cleanly.
                  */}
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error("Google sign-in failed. Please try again.")}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    text={isLogin ? "signin_with" : "signup_with"}
                    shape="rectangular"
                    width="9999"
                  />
                </div>
              )}
            </div>

            {/* Wholesale note */}
            <p className="mt-5 text-center text-xs text-gray-600 leading-relaxed">
              🏪 Wholesale partners — sign in with your credentials above.<br />
              You will be redirected to your portal automatically.
            </p>
          </div>
        </motion.div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-6 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} Melech Solution Hub. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Shield size={11} className="text-green-500" />
            Secured & encrypted
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
