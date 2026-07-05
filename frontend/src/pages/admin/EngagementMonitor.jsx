// frontend/src/pages/admin/EngagementMonitor.jsx
// Admin-only page showing customer engagement analytics.
// View A: Daily aggregate charts (from daily_engagement collection)
// View B: Individual session table with delete options
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, Users, ShoppingCart, TrendingUp, Eye,
  Trash2, RefreshCw, Filter, X, ChevronDown, ChevronUp,
  CheckSquare, Square, AlertTriangle, Calendar,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axiosInstance";

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = "text-indigo-600", bg = "bg-indigo-50" }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
      <Icon size={20} className={color} />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  </div>
);

// ── Simple bar chart (pure CSS — no chart lib needed) ────────────────────────
const MiniBarChart = ({ data = [], field = "totalEngaged", label = "Engaged", color = "bg-indigo-500" }) => {
  const max = Math.max(...data.map(d => d[field] || 0), 1);
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.slice(-30).map((d, i) => {
        const h = Math.max(2, Math.round(((d[field] || 0) / max) * 96));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div className={`w-full ${color} rounded-t transition-all`} style={{ height: h }} />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px]
              px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
              {d.date}: {d[field] || 0}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteAllModal = ({ onConfirm, onCancel, deleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
    style={{ backgroundColor: "rgba(0,0,0,0.5)", padding: "16px" }}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 my-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <AlertTriangle size={18} className="text-red-600" />
        </div>
        <h3 className="font-bold text-gray-800">Delete All Sessions?</h3>
      </div>
      <p className="text-sm text-gray-500 mb-2">
        This will delete <strong>all raw session records</strong>.
      </p>
      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-5">
        ✅ Daily aggregate reports will <strong>not</strong> be affected — your charts remain intact.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={deleting}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={deleting}
          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition disabled:opacity-50">
          {deleting ? "Deleting…" : "Delete All"}
        </button>
      </div>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const EngagementMonitor = () => {
  const [activeTab,    setActiveTab]    = useState("overview"); // "overview" | "sessions"
  const [dailyStats,   setDailyStats]   = useState([]);
  const [sessions,     setSessions]     = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [days,         setDays]         = useState(30);
  // Filters
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [abandonedOnly, setAbandonedOnly] = useState(false);
  const [showFilters,   setShowFilters]   = useState(false);
  // Selection
  const [selected,      setSelected]     = useState(new Set());
  // Delete
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const PAGE_SIZE = 50;

  // ── Fetch daily stats ───────────────────────────────────────────────────────
  const fetchDaily = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/engagement/daily?days=${days}`);
      if (res.data.success) setDailyStats(res.data.stats || []);
    } catch { toast.error("Failed to load daily stats"); }
  }, [days]);

  // ── Fetch sessions ──────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
      if (dateFrom)      params.set("dateFrom",     dateFrom);
      if (dateTo)        params.set("dateTo",        dateTo);
      if (abandonedOnly) params.set("abandonedOnly", "true");
      const res = await axiosInstance.get(`/engagement/sessions?${params}`);
      if (res.data.success) {
        setSessions(res.data.sessions || []);
        setTotal(res.data.total   || 0);
        setPages(res.data.pages   || 1);
        setPage(p);
        setSelected(new Set());
      }
    } catch { toast.error("Failed to load sessions"); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo, abandonedOnly]);

  // Initial load
  useEffect(() => { fetchDaily(); }, [fetchDaily]);
  useEffect(() => { if (activeTab === "sessions") fetchSessions(1); }, [activeTab, fetchSessions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDaily(), fetchSessions(page)]);
    setRefreshing(false);
  };

  // ── Aggregate totals from daily stats ───────────────────────────────────────
  const totals = useMemo(() => ({
    visitors:   dailyStats.reduce((s, d) => s + (d.totalVisitors   || 0), 0),
    engaged:    dailyStats.reduce((s, d) => s + (d.totalEngaged    || 0), 0),
    addedCart:  dailyStats.reduce((s, d) => s + (d.addedToCart     || 0), 0),
    purchases:  dailyStats.reduce((s, d) => s + (d.purchases       || 0), 0),
    abandoned:  dailyStats.reduce((s, d) => s + (d.abandonedCart   || 0), 0),
    conversion: dailyStats.length
      ? Math.round(dailyStats.reduce((s, d) => s + (d.conversionRate || 0), 0) / dailyStats.length * 10) / 10
      : 0,
  }), [dailyStats]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const toggleOne   = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll   = () => setSelected(prev => prev.size === sessions.length ? new Set() : new Set(sessions.map(s => s._id)));
  const allSelected = sessions.length > 0 && selected.size === sessions.length;

  // ── Delete handlers ──────────────────────────────────────────────────────────
  const deleteOne = async (id) => {
    try {
      await axiosInstance.delete(`/engagement/sessions/${id}`);
      setSessions(prev => prev.filter(s => s._id !== id));
      setTotal(t => t - 1);
      toast.success("Session deleted");
    } catch { toast.error("Delete failed"); }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    setDeleting(true);
    try {
      await axiosInstance.delete("/engagement/sessions/bulk", { data: { ids: [...selected] } });
      toast.success(`${selected.size} session(s) deleted`);
      fetchSessions(page);
    } catch { toast.error("Bulk delete failed"); }
    finally { setDeleting(false); }
  };

  const deleteAll = async () => {
    setDeleting(true);
    try {
      await axiosInstance.delete("/engagement/sessions/all", { data: { confirm: "DELETE_ALL" } });
      toast.success("All session records deleted");
      setShowDeleteAll(false);
      fetchSessions(1);
    } catch { toast.error("Delete all failed"); }
    finally { setDeleting(false); }
  };

  const resetFilters = () => { setDateFrom(""); setDateTo(""); setAbandonedOnly(false); };
  const hasFilters   = dateFrom || dateTo || abandonedOnly;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 size={22} className="text-indigo-500" />
            Engagement Monitor
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Track customers who browse and engage without completing a purchase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            {[7,14,30,60,90].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
          <button onClick={handleRefresh} disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: "overview", label: "Overview", icon: BarChart2 },
          { id: "sessions", label: "Sessions", icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition
              ${activeTab === id ? "bg-white shadow text-indigo-700" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Users}       label="Visitors"    value={totals.visitors}  color="text-gray-700"    bg="bg-gray-100"   />
            <StatCard icon={Eye}         label="Engaged"     value={totals.engaged}   color="text-indigo-600"  bg="bg-indigo-50"  />
            <StatCard icon={ShoppingCart}label="Added Cart"  value={totals.addedCart} color="text-blue-600"    bg="bg-blue-50"    />
            <StatCard icon={TrendingUp}  label="Purchases"   value={totals.purchases} color="text-green-600"   bg="bg-green-50"   />
            <StatCard icon={AlertTriangle} label="Abandoned" value={totals.abandoned} color="text-amber-600"   bg="bg-amber-50"   />
            <StatCard icon={BarChart2}   label="Conversion"  value={`${totals.conversion}%`} color="text-purple-600" bg="bg-purple-50" />
          </div>

          {/* Charts */}
          {dailyStats.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400">
              <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No data yet. Engagement data appears here after the daily rollup runs at 1 AM.</p>
              <p className="text-xs mt-1 text-gray-300">Sessions from today will appear tomorrow morning.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { field: "totalEngaged",  label: "Engaged visitors",  color: "bg-indigo-500" },
                { field: "purchases",     label: "Purchases",          color: "bg-green-500"  },
                { field: "abandonedCart", label: "Abandoned cart",     color: "bg-amber-500"  },
                { field: "addedToCart",   label: "Added to cart",      color: "bg-blue-500"   },
              ].map(({ field, label, color }) => (
                <div key={field} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</p>
                  <MiniBarChart data={dailyStats} field={field} label={label} color={color} />
                  <p className="text-[10px] text-gray-300 mt-2 text-center">
                    Hover a bar for date + value · showing last {Math.min(30, dailyStats.length)} days
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ SESSIONS TAB ══════════════════ */}
      {activeTab === "sessions" && (
        <div className="space-y-4">

          {/* Filter bar */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <button onClick={() => setShowFilters(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Filter size={14} className="text-gray-400" />
                Filters {hasFilters && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Active</span>}
              </span>
              {showFilters ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-100">
                  <div className="px-5 py-4 flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">From date</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">To date</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={abandonedOnly} onChange={e => setAbandonedOnly(e.target.checked)} className="rounded" />
                      <span className="text-sm text-gray-600">Abandoned only (engaged, no purchase)</span>
                    </label>
                    <div className="flex gap-2 ml-auto">
                      {hasFilters && <button onClick={resetFilters} className="text-xs text-red-500 hover:underline">Reset</button>}
                      <button onClick={() => fetchSessions(1)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition">
                        Apply
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-indigo-700">{selected.size} selected</span>
              <button onClick={deleteSelected} disabled={deleting}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                <Trash2 size={12} /> {deleting ? "Deleting…" : "Delete selected"}
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-indigo-500 hover:underline ml-auto">Clear selection</button>
            </div>
          )}

          {/* Table header actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">{total} session{total !== 1 ? "s" : ""} total</p>
            <button onClick={() => setShowDeleteAll(true)}
              className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition">
              <Trash2 size={12} /> Delete All Sessions
            </button>
          </div>

          {/* Desktop table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw size={16} className="animate-spin" /> Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No sessions found{hasFilters ? " matching filters" : ""}.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <button onClick={toggleAll}>
                          {allSelected ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
                        </button>
                      </th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Actions</th>
                      <th className="p-3 text-center">Cart Items</th>
                      <th className="p-3 text-center">Engaged</th>
                      <th className="p-3 text-center">Purchased</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sessions.map(s => (
                      <tr key={s._id} className={`hover:bg-gray-50 transition ${selected.has(s._id) ? "bg-indigo-50/40" : ""}`}>
                        <td className="p-3 text-center">
                          <button onClick={() => toggleOne(s._id)}>
                            {selected.has(s._id) ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} className="text-gray-300" />}
                          </button>
                        </td>
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1"><Calendar size={11} />{new Date(s.startedAt).toLocaleString()}</div>
                        </td>
                        <td className="p-3">
                          {s.customerId ? (
                            <div>
                              <p className="font-semibold text-gray-800 text-xs">{s.customerId.name || "—"}</p>
                              <p className="text-gray-400 text-[10px]">{s.customerId.email || ""}</p>
                              <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{s.customerId.role}</span>
                            </div>
                          ) : <span className="text-gray-300 text-xs italic">Guest / untracked</span>}
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {(s.actions || []).length > 0
                            ? [...new Set(s.actions.map(a => a.action))].map(a => (
                              <span key={a} className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-full text-[9px] font-medium mr-1 mb-0.5">
                                {a.replace(/_/g, " ")}
                              </span>
                            ))
                            : <span className="text-gray-300 italic">none</span>
                          }
                        </td>
                        <td className="p-3 text-center text-xs font-semibold text-gray-700">{(s.cartItems || []).length}</td>
                        <td className="p-3 text-center">
                          {s.engaged
                            ? <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Yes</span>
                            : <span className="text-[10px] text-gray-300">No</span>}
                        </td>
                        <td className="p-3 text-center">
                          {s.purchased
                            ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Yes</span>
                            : <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">No</span>}
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => deleteOne(s._id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {sessions.map(s => (
                  <div key={s._id} className={`bg-white border rounded-2xl p-4 shadow-sm ${selected.has(s._id) ? "border-indigo-300 bg-indigo-50/30" : "border-gray-100"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleOne(s._id)}>
                          {selected.has(s._id) ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} className="text-gray-300" />}
                        </button>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{s.customerId?.name || "Guest"}</p>
                          <p className="text-xs text-gray-400">{s.customerId?.email || ""}</p>
                          <p className="text-[10px] text-gray-300">{new Date(s.startedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteOne(s._id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${s.engaged ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"}`}>
                        {s.engaged ? "Engaged" : "Not engaged"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${s.purchased ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-600"}`}>
                        {s.purchased ? "Purchased" : "No purchase"}
                      </span>
                      <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{(s.cartItems || []).length} cart items</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button onClick={() => fetchSessions(page - 1)} disabled={page === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition">← Prev</button>
                  <span className="text-sm text-gray-500">Page {page} of {pages} · {total} sessions</span>
                  <button onClick={() => fetchSessions(page + 1)} disabled={page === pages}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete All confirm modal */}
      {showDeleteAll && (
        <DeleteAllModal
          onConfirm={deleteAll}
          onCancel={() => setShowDeleteAll(false)}
          deleting={deleting}
        />
      )}
    </div>
  );
};

export default EngagementMonitor;
