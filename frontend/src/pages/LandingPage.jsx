import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";

const LandingPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    role: "customer"
  });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // 🔹 Auto-redirect logged-in users
  useEffect(() => {
    const storedToken = localStorage.getItem("pos-token");
    const storedUser = localStorage.getItem("pos-user");

    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      if (user.role === "admin") navigate("/admin-dashboard");
      else if (user.role === "staff") navigate("/customer-dashboard");
      else navigate("/user-dashboard");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // 🔹 Login
        const response = await axiosInstance.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        if (response.data.success) {
          await login(response.data.user, response.data.token);
          toast.success("Login successful!");

          const role = response.data.user.role;
          if (role === "admin") navigate("/admin-dashboard");
          else if (role === "staff") navigate("/customer-dashboard");
          else if (role === "customer") navigate("/user-dashboard");
          else toast.error("Unknown user role. Please contact admin.");
        } else {
          toast.error(response.data.message);
        }
      } else {
        // 🔹 Signup
        const res = await axiosInstance.post("/users/register", formData);
        toast.success(res.data.message || "Signup successful!");

        // ✅ After signup, switch to login mode
        setIsLogin(true);

        // Optionally, prefill email & password
        setFormData({
          name: "",
          address: "",
          email: formData.email,
          password: formData.password,
          role: "customer",
        });
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Network error, please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-400 to-gray-100 flex flex-col">
      {/* HERO SECTION */}
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
          Manage your stock, orders, and customers efficiently with real-time tracking and seamless automation.
        </motion.p>
      </header>

      {/* AUTH CARD */}
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
            <>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400"
                required
              />
              <input
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400"
              />
            </>
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg shadow-lg transition-all"
          >
            {loading
              ? "Processing..."
              : isLogin
                ? "Login"
                : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-700 hover:underline font-semibold"
          >
            {isLogin ? "Sign up" : "Login"}
          </button>
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
