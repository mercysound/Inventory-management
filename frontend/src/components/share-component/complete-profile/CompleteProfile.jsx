import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import axiosInstance from "../../../utils/axiosInstance";

const CompleteProfile = () => {
  const [formData, setFormData] = useState({
    phone: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone) return toast.error("Phone number is required");

    setLoading(true);
    try {
      const res = await axiosInstance.put("/users/complete-profile", formData);

      if (res.data.success) {
        login(res.data.user, localStorage.getItem("pos-token")); // update context
        toast.success(res.data.message);

        // Redirect based on role
        if (res.data.user.role === "admin") navigate("/admin-dashboard");
        else if (res.data.user.role === "staff") navigate("/customer-dashboard");
        else navigate("/user-dashboard");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-6">Complete Your Profile</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="tel"
            name="phone"
            // pattern="^(\+234|0)[7-9][0-1]\d{8}$"
            placeholder="Phone Number (e.g. 08012345678)"

            value={formData.phone}
            onChange={handleChange}
            className="input-field"
            required
          />
          <input
            type="text"
            name="address"
            placeholder="Address (optional)"
            value={formData.address}
            onChange={handleChange}
            className="input-field"
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg shadow"
            disabled={loading}
          >
            {loading ? "Updating..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
