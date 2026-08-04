// src/pages/tenant/TenantLogin.jsx
// Store owner login at /store/:slug/login
// Also used by customers/staff at /shop/:slug/login
import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Store, Eye, EyeOff, Loader2, ShoppingCart, UserPlus } from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const TenantLogin = ({ mode = "customer" }) => {
  // mode: "owner" = store owner admin, "customer" = regular customer/wholesale
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const [isLogin,  setIsLogin]  = useState(true);
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"", address:"", role:"customer" });

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));

  const handleOwnerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/super-admin/store/${slug}/login`, {
        email: form.email, password: form.password,
      });
      if (res.data.success) {
        localStorage.setItem(`tenant-token-${slug}`, res.data.token);
        localStorage.setItem(`tenant-info-${slug}`,  JSON.stringify(res.data.tenant));
        toast.success("Welcome back!");
        navigate(`/store/${slug}/dashboard`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    } finally { setLoading(false); }
  };

  const handleCustomerAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isLogin
        ? `${BASE_URL}/t/${slug}/auth/login`
        : `${BASE_URL}/t/${slug}/auth/register`;
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, phone: form.phone, address: form.address };
      const res = await axios.post(url, payload);
      if (res.data.success) {
        localStorage.setItem(`tenant-user-token-${slug}`, res.data.token);
        localStorage.setItem(`tenant-user-${slug}`, JSON.stringify(res.data.user));
        toast.success(isLogin ? "Welcome back!" : "Account created!");
        navigate(`/shop/${slug}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally { setLoading(false); }
  };

  const isOwner   = mode === "owner";
  const onSubmit  = isOwner ? handleOwnerLogin : handleCustomerAuth;
  const inp = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-slate-900 flex flex-col items-center justify-center px-4 py-10">
      <Link to={`/shop/${slug}`} className="flex items-center gap-2 mb-6 text-indigo-300 hover:text-white transition">
        <ShoppingCart size={16} /> Back to shop
      </Link>

      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-7 w-full max-w-md">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow">
            {isOwner ? <Store size={18} className="text-white" /> : <ShoppingCart size={18} className="text-white" />}
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              {isOwner ? "Store Admin Login" : isLogin ? "Sign In" : "Create Account"}
            </h1>
            <p className="text-xs text-gray-400">Store: <span className="text-indigo-300 font-semibold">{slug}</span></p>
          </div>
        </div>

        {!isOwner && (
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-5">
            {["Sign In","Sign Up"].map((l,i) => (
              <button key={l} onClick={() => setIsLogin(i===0)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${(i===0)===isLogin ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-gray-300"}`}>
                {l}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          {!isLogin && !isOwner && (
            <>
              <input placeholder="Full name" value={form.name} onChange={e => set("name",e.target.value)} required className={inp} />
              <input placeholder="Phone number" value={form.phone} onChange={e => set("phone",e.target.value)} className={inp} />
              <input placeholder="Delivery address" value={form.address} onChange={e => set("address",e.target.value)} className={inp} />
              <select value={form.role} onChange={e => set("role",e.target.value)} className={inp}>
                <option value="customer">Retail Customer</option>
                <option value="wholesale">Wholesale</option>
              </select>
            </>
          )}
          <input type="email" placeholder="Email address" value={form.email} onChange={e => set("email",e.target.value)} required className={inp} />
          <div className="relative">
            <input type={showPw?"text":"password"} placeholder="Password" value={form.password}
              onChange={e => set("password",e.target.value)} required minLength={isOwner?6:8} className={inp+" pr-11"} />
            <button type="button" onClick={() => setShowPw(p=>!p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          <motion.button type="submit" disabled={loading} whileTap={{ scale:0.98 }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
              text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2 transition">
            {loading ? <><Loader2 size={15} className="animate-spin"/>Processing…</> : isOwner ? "Sign In to Dashboard" : isLogin ? "Sign In" : "Create Account"}
          </motion.button>
        </form>

        {!isOwner && (
          <p className="text-center text-xs text-gray-500 mt-4">
            Are you the store owner?{" "}
            <Link to={`/store/${slug}/login`} className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
              Admin login →
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export const TenantOwnerLogin = () => <TenantLogin mode="owner" />;
export const TenantCustomerLogin = () => <TenantLogin mode="customer" />;
export default TenantLogin;
