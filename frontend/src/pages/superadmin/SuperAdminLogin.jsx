// src/pages/superadmin/SuperAdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosInstance.post("/super-admin/login", { email, password });
      if (res.data.success) {
        localStorage.setItem("sa-token", res.data.token);
        localStorage.setItem("sa-admin", JSON.stringify(res.data.admin));
        toast.success("Welcome, Super Admin!");
        navigate("/super-admin/dashboard");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Super Admin</h1>
            <p className="text-xs text-gray-400">Platform Control Center</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-gray-500
                focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" placeholder="admin@platform.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
              hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm mt-2
              disabled:opacity-50 flex items-center justify-center gap-2 transition">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign In"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;
