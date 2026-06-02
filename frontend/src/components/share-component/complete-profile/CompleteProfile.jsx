import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import LoadingButton from "../LoadingButton";
import { useAuth } from "../../../context/AuthContext";
import axiosInstance from "../../../utils/axiosInstance";

const CompleteProfile = () => {
  const [formData, setFormData] = useState({
    phone: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" }); // Clear error on change
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (loading) return;

    setLoading(true);
    try {
      const res = await axiosInstance.put("/users/complete-profile", {
        phone: formData.phone.trim(),
        address: formData.address.trim()
      });

      if (res.data.success && res.data.user) {
        // Update context with the user data
        login(res.data.user, localStorage.getItem("pos-token"));
        toast.success(res.data.message || "Profile completed successfully!");

        // Small delay to ensure context is updated before navigation
        setTimeout(() => {
          const userRole = res.data.user.role;
          if (userRole === "admin") navigate("/admin-dashboard");
          else if (userRole === "staff") navigate("/customer-dashboard");
          else navigate("/user-dashboard");
        }, 300);
      } else {
        toast.error(res.data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to update profile. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative">
      {/* Home Button */}
      <motion.button
        onClick={handleGoHome}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-100 rounded-lg shadow-md hover:bg-slate-700 transition"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Home size={20} />
        <span className="hidden sm:inline font-medium">Home</span>
      </motion.button>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="app-surface rounded-2xl p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white">Complete Your Profile</h2>
          <p className="text-slate-300 text-sm mt-2">Add your contact details to finish setup</p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Phone Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="e.g. 08012345678"
              value={formData.phone}
              onChange={handleChange}
              className={`app-input ${
                errors.phone
                  ? "border-rose-500 focus:ring-rose-400"
                  : "border-slate-700 focus:ring-emerald-400"
              }`}
              required
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Address <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              name="address"
              placeholder="e.g. 123 Main Street, City"
              value={formData.address}
              onChange={handleChange}
              className={`app-input ${
                errors.address
                  ? "border-rose-500 focus:ring-rose-400"
                  : "border-slate-700 focus:ring-emerald-400"
              }`}
              required
            />
            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
          </div>

          {/* Submit Button */}
          <LoadingButton
            type="submit"
            loading={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-semibold py-3 rounded-lg shadow-md transition duration-200 mt-6"
          >
            {loading ? "Updating..." : "Complete Profile"}
          </LoadingButton>
        </form>

        {/* Footer Info */}
        <p className="text-xs text-slate-400 text-center mt-6">
          This information helps us serve you better
        </p>
      </motion.div>
    </div>
  );
};

export default CompleteProfile;
