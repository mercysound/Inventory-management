import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import { GoogleLogin } from "@react-oauth/google";
import { CheckCircle2, Package, BarChart3, TrendingUp, Lock } from "lucide-react";
import FormInput from "../components/share-component/FormInput";
import LoadingButton from "../components/share-component/LoadingButton";
import Tooltip from "../components/share-component/Tooltip";
import HelpText from "../components/share-component/HelpText";

const LandingPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    phone: "",
  });


  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { login } = useAuth();

  // Redirect logged-in users
  useEffect(() => {
    const token = localStorage.getItem("pos-token");
    const userData = localStorage.getItem("pos-user");

    if (token && userData) {
      const user = JSON.parse(userData);

      if (user.role === "admin") navigate("/admin-dashboard");
      else if (user.role === "staff") navigate("/customer-dashboard");
      else navigate("/user-dashboard");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    if (!isLogin) {
      if (!formData.name.trim()) newErrors.name = "Full name required";
      if (!formData.phone.trim()) newErrors.phone = "Phone number required";
      if (!formData.address.trim()) newErrors.address = "Address required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle email/password submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const response = await axiosInstance.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        const { success, message, user, token } = response.data;

        if (success) {
          await login(user, token); // Save to context/localStorage
          toast.success("Login successful!");

          // Redirect based on role
          const role = user.role;
          if (role === "admin") navigate("/admin-dashboard");
          else if (role === "staff") navigate("/customer-dashboard");
          else navigate("/user-dashboard");
        } else {
          toast.error(message || "Login failed");
        }
      } else {
        // Signup
        const response = await axiosInstance.post("/users/register", formData);
        const { success, message, user, token } = response.data;

        if (success && token && user) {
          // Auto-login after signup
          await login(user, token);
          toast.success("Signup successful! Welcome!");

          // Check if profile is complete
          if (!user.phone || !user.address) {
            navigate("/complete-profile");
          } else {
            // Redirect based on role
            const role = user.role;
            if (role === "admin") navigate("/admin-dashboard");
            else if (role === "staff") navigate("/customer-dashboard");
            else navigate("/user-dashboard");
          }
        } else {
          toast.success(message || "Signup successful! Please login.");
          setIsLogin(true);
          setFormData({
            name: "",
            address: "",
            phone: "",
            email: formData.email,
            password: formData.password,
          });
        }
      }
    } catch (error) {
      // Handle different error scenarios
      if (error.response) {
        // Backend returned a response
        toast.error(error.response.data?.message || "Login failed");
      } else if (error.request) {
        // Request made but no response received
        toast.error("No response from server. Check your network.");
      } else {
        // Something else
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  // HANDLE GOOGLE LOGIN SUCCESS
  // HANDLE GOOGLE LOGIN SUCCESS
  const handleGoogleSuccess = async (credentialResponse) => {
    // DEV: Log credentials for debugging only
    // if (import.meta.env.DEV) {
    //   console.log("Google credential received:", credentialResponse);
    // }

    setGoogleLoading(true);

    try {
      const tokenId = credentialResponse.credential;

      // Send token to backend
      const response = await axiosInstance.post("/auth/google-login", { tokenId });
      const { success, message, user, token } = response.data;

      if (!success) {
        // Show error toast
        toast.error(message || "Google login failed");
        if (import.meta.env.DEV) console.warn("Google login failed:", message);
        return;
      }

      // ✅ Login user in context / localStorage
      await login(user, token);
      toast.success("Google login successful!");

      // 🔹 Redirect helpers
      const redirectByRole = (role) => {
        if (role === "admin") navigate("/admin-dashboard");
        else if (role === "staff") navigate("/customer-dashboard");
        else navigate("/user-dashboard");
      };

      // 🔹 Check profile completion
      if (!user.phone || !user.address) {
        navigate("/complete-profile");
      } else {
        redirectByRole(user.role);
      }

    } catch (error) {
      // Handle axios / network errors
      if (error.response) {
        // Backend responded with a status outside 2xx
        toast.error(error.response.data?.message || "Google login failed");
        if (import.meta.env.DEV) console.error("Response error:", error.response.data);
      } else if (error.request) {
        // No response from server
        toast.error("No response from server. Check your network.");
        if (import.meta.env.DEV) console.error("Request error:", error.request);
      } else {
        // Other unexpected errors
        toast.error("An unexpected error occurred during Google login.");
        if (import.meta.env.DEV) console.error("Unexpected error:", error.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };



  // Button animation
  const googleButtonVariants = {
    initial: { scale: 1 },
    tap: { scale: 0.96 },
    hover: { scale: 1.02 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <BarChart3 size={20} />
              </div>
              <h1 className="text-xl font-bold">MELECH SH</h1>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="hidden rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 sm:inline-block"
            >
              {isLogin ? "Sign In" : "Get Started"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ── HERO + AUTH FORM SECTION ── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* LEFT: HERO CONTENT */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6 lg:order-1"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                  Inventory Management
                </p>
                <h2 className="text-4xl font-bold tracking-tight lg:text-5xl text-white">
                  Control your stock in real time
                </h2>
              </div>

              <p className="text-lg leading-relaxed text-slate-300">
                MELECH SH is an enterprise-grade inventory dashboard designed for retail, warehouse, and distribution teams. See your entire stock, orders, and supplier relationships at a glance.
              </p>

              {/* FEATURE LIST */}
              <div className="space-y-3 pt-4">
                {[
                  { icon: TrendingUp, label: "Live KPI tracking", desc: "Real-time products, stock, orders & revenue" },
                  { icon: CheckCircle2, label: "Stock health monitoring", desc: "Instant alerts for low & out-of-stock items" },
                  { icon: Lock, label: "Role-based access", desc: "Secure admin, staff & customer workflows" },
                  { icon: Package, label: "Supplier shortcuts", desc: "Fast reorder & invoice exports" },
                ].map(({ icon: Icon, label, desc }, i) => (
                  <div key={i} className="flex gap-3">
                    <Icon size={20} className="shrink-0 text-emerald-400 mt-1" />
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{label}</p>
                      <p className="text-sm text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA ON MOBILE */}
              <button
                onClick={() => setShowAuthModal(true)}
                className="mt-6 w-full rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 sm:hidden"
              >
                Get Started Now
              </button>
            </motion.div>
            {/* RIGHT: AUTH FORM (Desktop Sticky) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden lg:flex lg:order-2"
            >
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/50 p-8 shadow-2xl shadow-black/30 backdrop-blur-sm">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white">{isLogin ? "Welcome back" : "Create account"}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {isLogin
                      ? "Sign in to your dashboard"
                      : "Join your team and manage inventory together"}
                  </p>
                </div>

                <AuthForm
                  isLogin={isLogin}
                  formData={formData}
                  errors={errors}
                  loading={loading}
                  showPassword={showPassword}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  setShowPassword={setShowPassword}
                  handleGoogleSuccess={handleGoogleSuccess}
                  googleButtonVariants={googleButtonVariants}
                />

                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-400">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      className="font-semibold text-emerald-400 hover:text-emerald-300"
                    >
                      {isLogin ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>

                {isLogin && (
                  <button
                    onClick={() => navigate("/forgot-password")}
                    className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── TRUST BADGES ── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 hidden lg:block">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: "Enterprise-ready", desc: "Built with React, Node.js and production-grade architecture" },
              { title: "Secure & compliant", desc: "JWT authentication, encrypted passwords, role-based access control" },
              { title: "Designed for operations", desc: "Real-time updates, bulk exports, supplier integration" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/3 p-6">
                <h4 className="font-semibold text-white">{item.title}</h4>
                <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── AUTH MODAL (Mobile) ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center backdrop-blur-sm">
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-t-2xl bg-slate-900 p-6 sm:rounded-2xl"
          >
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">{isLogin ? "Sign in" : "Create account"}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {isLogin ? "Access your inventory dashboard" : "Start managing your stock"}
              </p>
            </div>

            <AuthForm
              isLogin={isLogin}
              formData={formData}
              errors={errors}
              loading={loading}
              showPassword={showPassword}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              setShowPassword={setShowPassword}
              handleGoogleSuccess={handleGoogleSuccess}
              googleButtonVariants={googleButtonVariants}
            />

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                {isLogin ? "New here? " : "Have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// ── AUTH FORM COMPONENT ──
const AuthForm = ({
  isLogin,
  formData,
  errors,
  loading,
  showPassword,
  handleChange,
  handleSubmit,
  setShowPassword,
  handleGoogleSuccess,
  googleButtonVariants,
}) => {
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput
              label="Full name"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <FormInput
              label="Phone"
              name="phone"
              placeholder="080 1234 5678"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              helpText="Include country code if outside local network"
              required
            />
          </div>
        )}

        {!isLogin && (
          <FormInput
            label="Address"
            name="address"
            placeholder="123 Market Road"
            value={formData.address}
            onChange={handleChange}
            error={errors.address}
            required
          />
        )}

        <FormInput
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
        />

        <div className="relative">
          <FormInput
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-xs text-slate-400 hover:text-slate-200"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <LoadingButton loading={loading} type="submit" className="w-full">
          {isLogin ? 'Sign in' : 'Create account'}
        </LoadingButton>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-700"></div>
        <span className="text-xs text-slate-500">or continue with</span>
        <div className="h-px flex-1 bg-slate-700"></div>
      </div>

      <div className="flex justify-center">
        <motion.div
          variants={googleButtonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
        >
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              toast.error("Google sign-in failed. Please try again.");
            }}
            useOneTap={false}
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
          />
        </motion.div>
      </div>
    </>
  );

