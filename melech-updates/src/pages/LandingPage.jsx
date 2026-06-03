import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import { GoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";

const LandingPage = () => {
  const [isLogin,      setIsLogin]      = useState(true);
  const [formData,     setFormData]     = useState({ name: "", email: "", password: "", address: "", phone: "" });
  const [loading,      setLoading]      = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors,       setErrors]       = useState({});

  const navigate = useNavigate();
  const { login } = useAuth();

  // ── Role → dashboard path helper ─────────────────────────────────────────
  const dashboardByRole = (role) => {
    if (role === "admin")     return "/admin-dashboard";
    if (role === "staff")     return "/customer-dashboard";
    if (role === "wholesale") return "/wholesale-dashboard";
    return "/user-dashboard";  // customer
  };

  // Redirect already-logged-in users
  useEffect(() => {
    const token    = localStorage.getItem("pos-token");
    const userData = localStorage.getItem("pos-user");
    if (token && userData) {
      const user = JSON.parse(userData);
      navigate(dashboardByRole(user.role));
    }
  }, [navigate]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email)                        newErrors.email    = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.password)                     newErrors.password = "Password is required";
    else if (formData.password.length < 6)      newErrors.password = "Password must be at least 6 characters";
    if (!isLogin) {
      if (!formData.name.trim())    newErrors.name    = "Full name required";
      if (!formData.phone.trim())   newErrors.phone   = "Phone number required";
      if (!formData.address.trim()) newErrors.address = "Address required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
          await login(user, token);
          toast.success("Login successful!");
          navigate(dashboardByRole(user.role));
        } else {
          toast.error(message || "Login failed");
        }
      } else {
        const response = await axiosInstance.post("/users/register", formData);
        const { success, message, user, token } = response.data;
        if (success && token && user) {
          await login(user, token);
          toast.success("Signup successful! Welcome!");
          if (!user.phone || !user.address) {
            navigate("/complete-profile");
          } else {
            navigate(dashboardByRole(user.role));
          }
        } else {
          toast.success(message || "Signup successful! Please login.");
          setIsLogin(true);
          setFormData({ name: "", address: "", phone: "", email: formData.email, password: formData.password });
        }
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data?.message || "Login failed");
      } else if (error.request) {
        toast.error("No response from server. Check your network.");
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const tokenId  = credentialResponse.credential;
      const response = await axiosInstance.post("/auth/google-login", { tokenId });
      const { success, message, user, token } = response.data;
      if (!success) { toast.error(message || "Google login failed"); return; }
      await login(user, token);
      toast.success("Google login successful!");
      if (!user.phone || !user.address) {
        navigate("/complete-profile");
      } else {
        navigate(dashboardByRole(user.role));
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data?.message || "Google login failed");
      } else if (error.request) {
        toast.error("No response from server. Check your network.");
      } else {
        toast.error("An unexpected error occurred during Google login.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleButtonVariants = {
    initial: { scale: 1 },
    tap:     { scale: 0.96 },
    hover:   { scale: 1.02 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-400 to-gray-100 flex flex-col">
      {/* HERO */}
      <header className="flex flex-col items-center justify-center py-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-extrabold text-white drop-shadow-lg"
        >
          Melech Solution Hub System
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-lg text-gray-100 max-w-2xl"
        >
          Manage your stock, orders, and customers efficiently with real-time tracking.
        </motion.p>
      </header>

      {/* FORM CARD */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mx-auto bg-white shadow-2xl rounded-3xl w-full max-w-md p-8"
      >
        <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">
          {isLogin ? "Login to Continue" : "Create Your Account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <input type="text" name="name" placeholder="Full Name"
                  value={formData.name} onChange={handleChange} className="input-field" required />
                {errors.name && <p className="error-text">{errors.name}</p>}
              </div>
              <div>
                <input type="text" name="address" placeholder="Address *"
                  value={formData.address} onChange={handleChange} className="input-field" required />
                {errors.address && <p className="error-text">{errors.address}</p>}
              </div>
              <div>
                <input type="tel" name="phone" placeholder="Phone Number (e.g. 08012345678) *"
                  value={formData.phone} onChange={handleChange} className="input-field" required />
                {errors.phone && <p className="error-text">{errors.phone}</p>}
              </div>
            </motion.div>
          )}

          <div>
            <input type="email" name="email" placeholder="Email"
              value={formData.email} onChange={handleChange} className="input-field" required />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password" placeholder="Password"
              value={formData.password} onChange={handleChange}
              className="input-field pr-10" required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600"
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg shadow-lg disabled:opacity-60">
            {loading ? "Processing..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-700 hover:underline font-semibold">
            {isLogin ? "Sign up" : "Login"}
          </button>
        </p>

        {isLogin && (
          <p className="text-center text-gray-600 mt-2">
            <button onClick={() => navigate("/forgot-password")}
              className="text-indigo-700 hover:underline text-sm">
              Forgot your password?
            </button>
          </p>
        )}

        {/* Google login */}
        <div className="my-6">
          <div className="flex items-center gap-3 my-6">
            <div className="h-[1px] flex-1 bg-gray-300" />
            <span className="text-gray-500 text-sm">Or continue with</span>
            <div className="h-[1px] flex-1 bg-gray-300" />
          </div>
          <motion.div variants={googleButtonVariants} initial="initial" whileHover="hover" whileTap="tap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google sign-in failed. Please try again.")}
              useOneTap={false}
              theme="outline"
              size="large"
              text={isLogin ? "signin_with" : "signup_with"}
              shape="rectangular"
              width="368"
            />
          </motion.div>
        </div>

        {/* Wholesale login note */}
        <p className="text-center text-xs text-gray-400 mt-2">
          🏪 Wholesale accounts? Login with your credentials above — you will be redirected to the wholesale portal.
        </p>
      </motion.div>

      {/* FOOTER */}
      <footer className="mt-16 py-6 bg-indigo-700 text-white text-center text-sm">
        © {new Date().getFullYear()} Melech Solution Hub. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
