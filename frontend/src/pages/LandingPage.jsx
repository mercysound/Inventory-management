import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import { GoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react"; // spinner icon

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
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
                {errors.name && <p className="error-text">{errors.name}</p>}
              </div>

              <div>
                <input
                  type="text"
                  name="address"
                  placeholder="Address *"
                  value={formData.address}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
                {errors.address && <p className="error-text">{errors.address}</p>}
              </div>

              <div>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number (e.g. 08012345678) *"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
                {errors.phone && <p className="error-text">{errors.phone}</p>}
              </div>
            </motion.div>
          )}

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              required
            />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="input-field pr-10"
              required
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600"
            >
              {showPassword ? "🙈" : "👁️"}
            </span>

            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg shadow-lg"
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-700 hover:underline font-semibold"
          >
            {isLogin ? "Sign up" : "Login"}
          </button>
        </p>

        {isLogin && (
          <p className="text-center text-gray-600 mt-2">
            <button
              onClick={() => navigate("/forgot-password")}
              className="text-indigo-700 hover:underline text-sm"
            >
              Forgot your password?
            </button>
          </p>
        )}

        {/* GOOGLE LOGIN */}
        <div className="my-6">
          <div className="flex items-center gap-3 my-6">
            <div className="h-[1px] flex-1 bg-gray-300"></div>
            <span className="text-gray-500 text-sm">Or continue with</span>
            <div className="h-[1px] flex-1 bg-gray-300"></div>
          </div>

          <GoogleLogin
            clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.error("Google OAuth error");
              toast.error("Google sign-in failed. Please try again.");
            }}
            useOneTap={false}
            theme="outline"
            size="large"
            text={isLogin ? "signin_with" : "signup_with"}
            shape="rectangular"
            render={(renderProps) => (
              <motion.button
                variants={googleButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={() => {
                  console.log("Google button clicked");
                  renderProps.onClick();
                }}
                disabled={renderProps.disabled || googleLoading}
                className={`w-full flex items-center justify-center gap-3
        bg-white border border-gray-300 shadow-sm
        hover:shadow-md py-2.5 rounded-xl transition-all
        ${renderProps.disabled || googleLoading
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                  }
      `}
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                ) : (
                  <>
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google"
                      className="w-5 h-5"
                    />
                    <span className="text-gray-700 font-medium">
                      {isLogin ? "Sign in with Google" : "Sign up with Google"}
                    </span>
                  </>
                )}
              </motion.button>
            )}
          />

        </div>
      </motion.div>

      {/* FOOTER */}
      <footer className="mt-16 py-6 bg-indigo-700 text-white text-center text-sm">
        © {new Date().getFullYear()} Melech Solution Hub. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
