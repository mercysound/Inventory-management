import React, { useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { ArrowLeft, Mail } from "lucide-react";
import LoadingButton from "../components/share-component/LoadingButton";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/auth/forgot-password", { email });

      if (response.data.success) {
        setEmailSent(true);
        toast.success("Password reset link sent to your email!");
      } else {
        toast.error(response.data.message || "Failed to send reset email");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      
      // Better error messages for different failure types
      let errorMessage = "Failed to send reset email. Please try again.";
      
      // Timeout errors (SMTP or network)
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Email service may be slow. Please wait a moment and try again.";
      }
      // Server error (500)
      else if (error.response?.status === 500) {
        errorMessage = error.response?.data?.message || "Email service is temporarily unavailable. Please try again later.";
      }
      // Other server errors with message
      else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto app-surface rounded-3xl w-full max-w-md p-8 mt-20"
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-slate-300 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setEmailSent(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-2 rounded-lg transition-colors"
              >
                Try Different Email
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full app-button-secondary py-2 rounded-lg transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
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
          Reset your password to regain access to your account.
        </motion.p>
      </header>

      {/* Form Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mx-auto app-surface rounded-3xl w-full max-w-md p-8"
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
          Forgot Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="app-input"
              required
            />
          </div>

          <LoadingButton loading={loading} type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 py-3 rounded-lg shadow-lg transition-colors flex items-center justify-center">
            {loading ? (
              <>Sending...</>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-2" />
                Send Reset Link
              </>
            )}
          </LoadingButton>
        </form>

        <p className="text-center text-slate-400 mt-6 text-sm">
          Remember your password?{" "}
          <button
            onClick={() => navigate("/")}
            className="text-emerald-300 hover:text-white font-semibold"
          >
            Sign in
          </button>
        </p>
      </motion.div>

      {/* Footer */}
      <footer className="mt-16 py-6 bg-slate-900/95 text-slate-200 text-center text-sm">
        © {new Date().getFullYear()} Melech Solution Hub. All rights reserved.
      </footer>
    </div>
  );
};

export default ForgotPassword;