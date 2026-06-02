import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import LoadingButton from "../components/share-component/LoadingButton";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [tokenValid, setTokenValid] = useState(null);
  const [validatingToken, setValidatingToken] = useState(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      validateToken(tokenFromUrl);
    } else {
      setTokenValid(false);
      setValidatingToken(false);
    }
  }, [searchParams]);

  const validateToken = async (resetToken) => {
    try {
      const response = await axiosInstance.post("/auth/validate-reset-token", { token: resetToken });
      setTokenValid(response.data.success);
    } catch (error) {
      setTokenValid(false);
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password) {
      toast.error("Please enter a new password");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/auth/reset-password", {
        token,
        password,
      });

      if (response.data.success) {
        toast.success("Password reset successfully! You can now log in with your new password.");
        navigate("/");
      } else {
        toast.error(response.data.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(error.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="app-surface shadow-2xl rounded-3xl w-full max-w-md p-8 text-center"
        >
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-400" />
          <p className="text-slate-300">Validating reset link...</p>
        </motion.div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto app-surface shadow-2xl rounded-3xl w-full max-w-md p-8 mt-20 text-center"
        >
          <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h2>
          <p className="text-slate-300 mb-6">
            This password reset link is invalid or has expired.
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-2 rounded-lg transition-colors"
          >
            Request New Reset Link
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
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
          className="mt-4 text-lg text-slate-300 max-w-2xl"
        >
          Enter your new password to complete the reset process.
        </motion.p>
      </header>

      {/* Form Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mx-auto app-surface shadow-2xl rounded-3xl w-full max-w-md p-8"
      >
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-emerald-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Login
          </button>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-6">
          Reset Your Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="app-input pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="app-input pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <LoadingButton loading={loading} type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 py-3 rounded-lg shadow-lg transition-colors flex items-center justify-center">
            {loading ? (
              <>
                Resetting...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Reset Password
              </>
            )}
          </LoadingButton>
        </form>
      </motion.div>

      {/* Footer */}
      <footer className="mt-16 py-6 bg-slate-900/95 text-slate-200 text-center text-sm">
        © {new Date().getFullYear()} Melech Solution Hub. All rights reserved.
      </footer>
    </div>
  );
};

export default ResetPassword;