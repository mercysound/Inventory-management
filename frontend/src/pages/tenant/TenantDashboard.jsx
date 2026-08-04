// src/pages/tenant/TenantDashboard.jsx
// Store owner's admin dashboard at /store/:slug/dashboard
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link, Routes, Route } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  Store, Package, Users, TrendingUp, ShoppingBag,
  LogOut, Settings, RefreshCw, Plus, Loader2,
  AlertTriangle, CheckCircle2, Menu, X,
} from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const getToken = (slug) => localStorage.getItem(`tenant-token-${slug}`);
const getInfo  = (slug) => { try { return JSON.parse(localStorage.getItem(`tenant-info-${slug}`) || "{}"); } catch { return {}; } };

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className={`${color} rounded-2xl p-5 text-white shadow-lg`}>
    <div className="flex items-start justify-between mb-3">
      <Icon size={22} className="opacity-80" />
    </div>
    <p className="text-3xl font-extrabold leading-none">{value}</p>
    <p className="text-sm font-semibold mt-1 opacity-80">{label}</p>
    {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
  </div>
);

// ── Plan badge ─────────────────────────────────────────────────────────────────
const PlanBar = ({ plan, trialEndsAt, planExpiresAt }) => {
  const isTrialExpired = plan==="trial" && trialEndsAt && new Date()>new Date(trialEndsAt);
  const isPlanExpired  = planExpiresAt && new Date()>new Date(planExpiresAt);
  if (isTrialExpired || isPlanExpired) return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
      <AlertTriangle size={14} className="text-red-500 shrink-0"/>
      <p className="text-sm text-red-700 font-semibold">
        Your plan has expired. Please contact platform support to renew.
      </p>
    </div>
  );
  if (plan==="trial" && trialEndsAt) {
    const days = Math.ceil((new Date(trialEndsAt)-new Date())/(1000*60*60*24));
    if (days<=7) return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
        <AlertTriangle size={14} className="text-amber-500 shrink-0"/>
        <p className="text-sm text-amber-700 font-semibold">
          Trial ends in {days} day{days!==1?"s":""}. Contact platform support to upgrade.
        </p>
      </div>
    );
  }
  return null;
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const TenantDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("overview"); // overview | products | users
  const [menuOpen, setMenuOpen] = useState(false);

  const token    = getToken(slug);
  const info     = getInfo(slug);
  const headers  = { Authorization: `Bearer ${token}` };

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/t/${slug}/dashboard`, { headers });
      if (res.data.success) setStats(res.data);
    } catch (err) {
      if (err?.response?.status===401||err?.response?.status===403) {
        toast.error("Session expired"); navigate(`/store/${slug}/login`);
      }
    }
  }, [slug]);  // eslint-disable-line

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/t/${slug}/products`, { headers });
      if (res.data.success) setProducts(res.data.products||[]);
    } catch {}
  }, [slug]);  // eslint-disable-line

  const fetchAll = useCallback(async () => {
    if (!token) { navigate(`/store/${slug}/login`); return; }
    setLoading(true);
    await Promise.all([fetchStats(), fetchProducts()]);
    setLoading(false);
  }, [fetchStats, fetchProducts, token, navigate, slug]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = () => {
    localStorage.removeItem(`tenant-token-${slug}`);
    localStorage.removeItem(`tenant-info-${slug}`);
    navigate(`/store/${slug}/login`);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await axios.delete(`${BASE_URL}/t/${slug}/products/${id}`, { headers });
      toast.success("Product deleted");
      setProducts(prev => prev.filter(p=>p._id!==id));
    } catch { toast.error("Failed to delete"); }
  };

  const TABS = [
    { id:"overview", label:"Overview",  icon: TrendingUp },
    { id:"products", label:"Products",  icon: Package },
    { id:"users",    label:"Customers", icon: Users },
    { id:"settings", label:"Settings",  icon: Settings },
  ];

  const planInfo = info;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-gradient-to-r from-indigo-900 to-violet-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Store size={15} className="text-white"/>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{info.name || slug}</p>
            <p className="text-[10px] text-indigo-300">Store Admin · <span className="capitalize">{info.plan||"trial"} plan</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/shop/${slug}`} target="_blank"
            className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition px-3 py-1.5 rounded-lg bg-white/10">
            <Package size={12}/> View Shop
          </Link>
          <button onClick={fetchAll} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white">
            <RefreshCw size={13} className={loading?"animate-spin":""}/>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-red-300 transition px-3 py-1.5 rounded-lg bg-white/10">
            <LogOut size={12}/> Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Plan warning */}
        {planInfo && <PlanBar plan={planInfo.plan} trialEndsAt={planInfo.trialEndsAt} planExpiresAt={planInfo.planExpiresAt}/>}

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white border border-gray-100 rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                tab===t.id?"bg-indigo-600 text-white shadow-sm":"text-gray-600 hover:bg-gray-50"}`}>
              <t.icon size={13}/>{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400"/></div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab==="overview" && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard icon={Package}     label="Products"   value={stats.totalProducts} color="bg-gradient-to-br from-indigo-500 to-indigo-700" />
                  <StatCard icon={Users}        label="Customers"  value={stats.totalUsers}    color="bg-gradient-to-br from-violet-500 to-violet-700" />
                  <StatCard icon={ShoppingBag}  label="Orders"     value={stats.totalOrders}   color="bg-gradient-to-br from-green-500 to-emerald-700" />
                  <StatCard icon={TrendingUp}   label="Revenue"    value={`₦${Number(stats.totalRevenue||0).toLocaleString()}`} color="bg-gradient-to-br from-amber-500 to-orange-600" />
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={()=>setTab("products")}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
                      <Plus size={14}/> Add Product
                    </button>
                    <Link to={`/shop/${slug}`} target="_blank"
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                      <Store size={14}/> View Your Shop
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {tab==="products" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800">Products ({products.length})</h2>
                </div>
                {products.length===0 ? (
                  <div className="flex flex-col items-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Package size={36} className="text-gray-200 mb-3"/>
                    <p className="text-gray-400">No products yet</p>
                    <p className="text-xs text-gray-400 mt-1">Use the full admin panel to add products</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map(p => (
                      <div key={p._id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                        {(p.images?.[0]||p.image)
                          ? <img src={p.images?.[0]||p.image} alt={p.name} className="w-14 h-14 rounded-xl object-contain bg-gray-50 shrink-0"/>
                          : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Package size={18} className="text-gray-300"/></div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.categoryId?.name||"—"} · ₦{Number(p.price).toLocaleString()}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock===0?"bg-red-100 text-red-600":p.stock<5?"bg-amber-100 text-amber-700":"bg-green-100 text-green-700"}`}>
                              {p.stock===0?"Out of stock":`${p.stock} in stock`}
                            </span>
                          </div>
                        </div>
                        <button onClick={()=>handleDeleteProduct(p._id)}
                          className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center transition shrink-0">
                          <X size={14}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* USERS */}
            {tab==="users" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Customers</h2>
                <p className="text-sm text-gray-400">User management will appear here — customers who register in your store.</p>
              </div>
            )}

            {/* SETTINGS */}
            {tab==="settings" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Store Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label:"Store Name",  value: info.name     || slug },
                    { label:"Store URL",   value: `/shop/${slug}` },
                    { label:"Your Email",  value: "View in super admin panel" },
                    { label:"Current Plan", value: (info.plan||"trial").toUpperCase(), color:"text-indigo-600 font-bold" },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
                      <p className={`text-sm font-semibold text-gray-800 mt-0.5 ${s.color||""}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">To change your store settings, contact platform support.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TenantDashboard;
