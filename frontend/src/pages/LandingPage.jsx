import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import { GoogleLogin } from "@react-oauth/google";
import { Loader2, CheckCircle2, Package, BarChart3, ShieldCheck } from "lucide-react";

const LandingPage = () => {
  const [isLogin, setIsLogin] = useState(true);
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
  const formRef = useRef(null);

  const scrollToAuth = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-gray-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sticky top-0 z-30 mb-6 rounded-3xl border border-white/10 bg-slate-950/95 px-4 py-4 shadow-xl shadow-black/20 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">MELECH SH</p>
              <p className="mt-1 text-sm text-slate-400">Fast access to your inventory dashboard.</p>
            </div>
            <button
              type="button"
              onClick={scrollToAuth}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:bg-emerald-400"
            >
              Login / Sign up
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-8 lg:max-w-xl">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-emerald-300">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
                <ShieldCheck size={18} />
              </span>
              Inventory made simple for teams
            </div>

            <motion.div
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                MELECH SH
              </h1>
              <p className="text-lg leading-8 text-slate-300 max-w-2xl">
                A professional inventory dashboard for retail, warehouse and distribution teams.
                Track stock health, orders, suppliers and invoices in one live workspace.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200 mb-3">
                    <BarChart3 size={20} />
                  </div>
                  <h3 className="font-semibold text-white">Live stock & KPI tracking</h3>
                  <p className="mt-2 text-sm text-slate-400">View products, orders and revenue in real time.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200 mb-3">
                    <Package size={20} />
                  </div>
                  <h3 className="font-semibold text-white">Supplier reorder shortcuts</h3>
                  <p className="mt-2 text-sm text-slate-400">Quickly restock low inventory from your supplier list.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-200 mb-3">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="font-semibold text-white">Role-based access</h3>
                  <p className="mt-2 text-sm text-slate-400">Admin, staff and customer workflows with secure permissions.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200 mb-3">
                    <Package size={20} />
                  </div>
                  <h3 className="font-semibold text-white">Order & invoice exports</h3>
                  <p className="mt-2 text-sm text-slate-400">Generate receipts and export order summaries in seconds.</p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            ref={formRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="w-full max-w-xl rounded-[36px] border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-black/25 backdrop-blur-xl"
          >
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Access the dashboard</p>
              <h2 className="mt-4 text-3xl font-semibold text-white">{isLogin ? "Login" : "Sign up"}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {isLogin
                  ? "Enter your credentials to access MELECH SH."
                  : "Create your account to start managing inventory with your team."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Full name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                    />
                    {errors.name && <p className="mt-2 text-xs text-rose-400">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="080 1234 5678"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                    />
                    {errors.phone && <p className="mt-2 text-xs text-rose-400">{errors.phone}</p>}
                  </div>
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Address</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="123 Market Road"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                  />
                  {errors.address && <p className="mt-2 text-xs text-rose-400">{errors.address}</p>}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Email address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                />
                {errors.email && <p className="mt-2 text-xs text-rose-400">{errors.email}</p>}
              </div>

              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 pr-12 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-11 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
                {errors.password && <p className="mt-2 text-xs text-rose-400">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Processing..." : isLogin ? "Login" : "Create account"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <span>{isLogin ? "New to MELECH SH?" : "Already have an account?"}</span>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-semibold text-white hover:text-emerald-300"
              >
                {isLogin ? "Create an account" : "Sign in instead"}
              </button>
            </div>

            {isLogin && (
              <button
                onClick={() => navigate("/forgot-password")}
                className="mt-4 w-full text-center text-sm text-slate-300 hover:text-white"
              >
                Forgot your password?
              </button>
            )}

            <div className="my-7">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                <span className="h-px flex-1 bg-slate-700"></span>
                <span>or continue with</span>
                <span className="h-px flex-1 bg-slate-700"></span>
              </div>

              <motion.div
                variants={googleButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                className="mt-5 w-full max-w-[340px]"
              >
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    toast.error("Google sign-in failed. Please try again.");
                  }}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text={isLogin ? "signin_with" : "signup_with"}
                  shape="rectangular"
                  style={{ width: "100%" }}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-lg shadow-black/10">
            <h3 className="font-semibold text-white">Built for real operations</h3>
            <p className="mt-3 text-sm text-slate-400">Designed for retail stores, warehouses and distribution teams who need fast inventory visibility.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-lg shadow-black/10">
            <h3 className="font-semibold text-white">Live alerts, not guesswork</h3>
            <p className="mt-3 text-sm text-slate-400">Get low-stock warnings, supplier reminders and order summaries without manual spreadsheets.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-lg shadow-black/10">
            <h3 className="font-semibold text-white">Simple for every role</h3>
            <p className="mt-3 text-sm text-slate-400">Admin, staff and customer access paths are clear, secure and easy to use.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
