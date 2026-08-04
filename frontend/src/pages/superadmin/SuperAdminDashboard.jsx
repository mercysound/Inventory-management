// src/pages/superadmin/SuperAdminDashboard.jsx
// Platform control center — list all stores, create stores, manage plans.
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  ShieldCheck, Store, Plus, Search, RefreshCw, LogOut,
  Users, TrendingUp, Package, ToggleLeft, ToggleRight,
  Edit2, Trash2, X, Loader2, Eye, EyeOff, Calendar,
  CheckCircle2, AlertTriangle, Clock, DollarSign,
} from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";

// ── Axios interceptor for super-admin token ───────────────────────────────────
const saAxios = axiosInstance.create
  ? axiosInstance  // reuse instance, inject token via interceptor below
  : axiosInstance;

const getSaToken = () => localStorage.getItem("sa-token");

// ── Plan badge ────────────────────────────────────────────────────────────────
const PlanBadge = ({ plan }) => {
  const map = {
    free:   "bg-gray-100 text-gray-600",
    trial:  "bg-amber-100 text-amber-700",
    basic:  "bg-blue-100 text-blue-700",
    pro:    "bg-violet-100 text-violet-700",
    custom: "bg-green-100 text-green-700",
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${map[plan] || map.free}`}>
      {plan}
    </span>
  );
};

// ── Create / Edit Tenant Modal ────────────────────────────────────────────────
const TenantModal = ({ mode, tenant, onClose, onSaved }) => {
  const isCreate = mode === "create";
  const [form, setForm] = useState(isCreate ? {
    name: "", slug: "", description: "", ownerName: "", ownerEmail: "",
    ownerPassword: "", plan: "trial", planPrice: 0, planNote: "", trialDays: 14,
  } : {
    name:        tenant.name,
    description: tenant.description || "",
    plan:        tenant.plan,
    planPrice:   tenant.planPrice || 0,
    planNote:    tenant.planNote  || "",
    trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString().slice(0,10) : "",
    planExpiresAt: tenant.planExpiresAt ? new Date(tenant.planExpiresAt).toISOString().slice(0,10) : "",
    isActive:    tenant.isActive,
    ownerName:   tenant.ownerName,
    notes:       tenant.notes || "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = getSaToken();
      let res;
      if (isCreate) {
        res = await axiosInstance.post("/super-admin/tenants", form,
          { headers: { Authorization: `Bearer ${token}` } });
      } else {
        res = await axiosInstance.put(`/super-admin/tenants/${tenant._id}`, form,
          { headers: { Authorization: `Bearer ${token}` } });
      }
      if (res.data.success) {
        toast.success(isCreate ? "Store created!" : "Store updated!");
        onSaved();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Operation failed");
    } finally { setLoading(false); }
  };

  const inp = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50";

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Store size={16} className="text-violet-600" />
            {isCreate ? "Create New Store" : `Edit: ${tenant.name}`}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isCreate && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Store Name *</label>
                  <input value={form.name} onChange={e => {
                    set("name", e.target.value);
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""));
                  }} required className={inp} placeholder="My Electronics Store" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">URL Slug *</label>
                  <input value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))}
                    required className={inp} placeholder="my-electronics" />
                  {form.slug && <p className="text-[10px] text-indigo-500 mt-0.5">Shop: /shop/{form.slug}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Description</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  rows={2} className={inp + " resize-none"} placeholder="Brief store description…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Owner Name *</label>
                  <input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} required className={inp} placeholder="John Adewole" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Owner Email *</label>
                  <input type="email" value={form.ownerEmail} onChange={e => set("ownerEmail", e.target.value)} required className={inp} placeholder="owner@store.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Owner Password *</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={form.ownerPassword}
                    onChange={e => set("ownerPassword", e.target.value)} required minLength={8} className={inp + " pr-10"} placeholder="Min 8 chars" />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </>
          )}
          {!isCreate && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Store Name</label>
                  <input value={form.name} onChange={e => set("name", e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Owner Name</label>
                  <input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Description</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  rows={2} className={inp + " resize-none"} />
              </div>
            </>
          )}

          {/* Plan section */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">Plan Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Plan</label>
                <select value={form.plan} onChange={e => set("plan", e.target.value)} className={inp}>
                  {["free","trial","basic","pro","custom"].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Monthly Price (₦) <span className="normal-case font-normal text-gray-400">(0 = free)</span>
                </label>
                <input type="number" min="0" value={form.planPrice} onChange={e => set("planPrice", e.target.value)} className={inp} />
              </div>
            </div>
            {form.plan === "trial" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  {isCreate ? "Trial Days" : "Trial Ends"}
                </label>
                {isCreate
                  ? <input type="number" min="1" max="365" value={form.trialDays} onChange={e => set("trialDays", e.target.value)} className={inp} />
                  : <input type="date" value={form.trialEndsAt} onChange={e => set("trialEndsAt", e.target.value)} className={inp} />
                }
              </div>
            )}
            {!isCreate && form.plan !== "free" && form.plan !== "trial" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Plan Expires</label>
                <input type="date" value={form.planExpiresAt} onChange={e => set("planExpiresAt", e.target.value)} className={inp} />
                <p className="text-[10px] text-gray-400 mt-0.5">Leave blank = never expires</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Plan Note (internal)</label>
              <input value={form.planNote} onChange={e => set("planNote", e.target.value)} className={inp} placeholder="e.g. Paid via bank transfer on 01 Jan" />
            </div>
          </div>

          {!isCreate && (
            <div className="flex items-center justify-between py-2 border border-gray-200 rounded-xl px-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Store Active</p>
                <p className="text-xs text-gray-400 mt-0.5">Toggle to suspend/activate this store</p>
              </div>
              <button type="button" onClick={() => set("isActive", !form.isActive)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-gray-300"}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold
                disabled:opacity-50 flex items-center justify-center gap-2 transition">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : isCreate ? "Create Store" : "Save Changes"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [modal,   setModal]   = useState(null); // { mode: "create" | "edit", tenant? }

  const token = getSaToken();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        axiosInstance.get("/super-admin/stats", { headers }),
        axiosInstance.get("/super-admin/tenants", { headers, params: { limit: 100 } }),
      ]);
      if (statsRes.data.success)   setStats(statsRes.data);
      if (tenantsRes.data.success) setTenants(tenantsRes.data.tenants);
    } catch (err) {
      if (err?.response?.status === 401) {
        toast.error("Session expired"); navigate("/super-admin");
      } else {
        toast.error("Failed to load data");
      }
    } finally { setLoading(false); }
  }, []);  // eslint-disable-line

  useEffect(() => {
    if (!token) { navigate("/super-admin"); return; }
    fetchAll();
  }, [fetchAll, navigate, token]);

  const handleToggle = async (tenant) => {
    try {
      const res = await axiosInstance.patch(`/super-admin/tenants/${tenant._id}/status`, {}, { headers });
      if (res.data.success) {
        toast.success(res.data.message);
        setTenants(prev => prev.map(t => t._id === tenant._id ? { ...t, isActive: !t.isActive } : t));
      }
    } catch { toast.error("Failed to update"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("sa-token");
    localStorage.removeItem("sa-admin");
    navigate("/super-admin");
  };

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.slug.includes(q) || t.ownerEmail.toLowerCase().includes(q);
    const matchPlan   = !planFilter || t.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const admin = (() => { try { return JSON.parse(localStorage.getItem("sa-admin") || "{}"); } catch { return {}; } })();

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Top bar */}
      <div className="bg-[#161822] border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <ShieldCheck size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Platform Control Center</p>
            <p className="text-[10px] text-gray-500">Signed in as {admin.name || "Super Admin"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white transition">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition px-3 py-2 rounded-lg bg-gray-800">
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Stores",     value: stats.totalStores,    icon: Store,       color: "text-violet-400" },
              { label: "Active Stores",    value: stats.activeStores,   icon: CheckCircle2, color: "text-green-400" },
              { label: "Suspended",        value: stats.suspendedStores, icon: AlertTriangle, color: "text-red-400" },
              { label: "On Trial",         value: stats.planBreakdown?.trial || 0, icon: Clock, color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="bg-[#161822] border border-gray-800 rounded-2xl px-4 py-4 flex items-center gap-3">
                <s.icon size={22} className={s.color} />
                <div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stores…"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#161822] border border-gray-700 text-sm text-gray-200
                  placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161822] border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">All Plans</option>
              {["free","trial","basic","pro","custom"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>
          <button onClick={() => setModal({ mode: "create" })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700
              text-white text-sm font-bold transition shadow-lg shadow-violet-900/30">
            <Plus size={15} /> New Store
          </button>
        </div>

        {/* Store table */}
        <div className="bg-[#161822] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-300">
              {filtered.length} store{filtered.length !== 1 ? "s" : ""}
              {(search || planFilter) && " (filtered)"}
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-600">
              <Store size={36} className="mb-3 text-gray-700" />
              <p className="text-sm">No stores found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtered.map(t => (
                <div key={t._id} className="px-5 py-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <PlanBadge plan={t.plan} />
                      {!t.isActive && (
                        <span className="text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      /shop/{t.slug} · {t.ownerEmail}
                    </p>
                    {t.planPrice > 0 && (
                      <p className="text-xs text-green-500 mt-0.5 flex items-center gap-1">
                        <DollarSign size={10} /> ₦{Number(t.planPrice).toLocaleString()}/mo
                      </p>
                    )}
                    {t.trialEndsAt && t.plan === "trial" && (
                      <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />
                        Trial ends {new Date(t.trialEndsAt).toLocaleDateString()}
                        {new Date() > new Date(t.trialEndsAt) && <span className="text-red-400 font-bold ml-1">EXPIRED</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setModal({ mode: "edit", tenant: t })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white transition">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleToggle(t)}
                      title={t.isActive ? "Suspend store" : "Activate store"}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
                        t.isActive ? "bg-green-900/40 text-green-400 hover:bg-red-900/40 hover:text-red-400" : "bg-gray-800 text-gray-500 hover:bg-green-900/40 hover:text-green-400"}`}>
                      {t.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <TenantModal
            mode={modal.mode}
            tenant={modal.tenant}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); fetchAll(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminDashboard;
