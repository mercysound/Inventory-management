import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import {
  ShoppingBag, Package, Users, TrendingUp,
  AlertTriangle, Clock, RefreshCw, TrendingDown,
  Zap, Eye, Target,
} from "lucide-react";

// ── Stat card with visual bar ──
const StatCard = ({ label, value, icon: Icon, color, bg, sub, loading, percentage, max }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`${bg} rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-shadow`}
  >
    <div className="flex items-start gap-3 mb-3">
      <div className={`p-3 rounded-xl ${color} bg-white/60 flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        {loading ? (
          <div className="h-8 w-24 bg-white/60 rounded-lg animate-pulse" />
        ) : (
          <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight truncate">{value}</p>
        )}
        {sub && !loading && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
    {!loading && percentage !== undefined && max !== undefined && (
      <div className="mt-3">
        <div className="h-2 bg-white/40 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className={`h-full ${color.replace('text-', 'bg-')}`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{Math.round((value / max) * 100)}% of capacity</p>
      </div>
    )}
  </motion.div>
);

// ── Mini progress chart ──
const MiniChart = ({ items, title, colors }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
  >
    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">{title}</h3>
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-gray-700">{item.label}</p>
            <p className="text-sm font-bold text-gray-900">{item.value}</p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
              transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
              className={`h-full ${colors[idx] || 'bg-indigo-500'}`}
            />
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

// ── KPI with trending ──
const KPICard = ({ label, value, icon: Icon, color, sub, trend, trendUp }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`${color} rounded-xl p-4 text-white shadow-lg`}
  >
    <div className="flex items-start justify-between mb-2">
      <Icon size={24} className="opacity-80" />
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? 'text-green-300' : 'text-red-300'}`}>
          {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trend}%
        </div>
      )}
    </div>
    <p className="text-sm opacity-90 mb-1">{label}</p>
    <p className="text-3xl font-bold mb-1">{value}</p>
    {sub && <p className="text-xs opacity-75">{sub}</p>}
  </motion.div>
);

const Summary = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(false);

      const TIMEOUT = 30000;
      const results = await Promise.allSettled([
        axiosInstance.get("/products", { timeout: TIMEOUT }),
        axiosInstance.get("/placed-orders", { timeout: TIMEOUT }),
        axiosInstance.get("/completed-history", { timeout: TIMEOUT }),
        axiosInstance.get("/users", { timeout: TIMEOUT }),
      ]);

      const getData = (res, pathFallback) => {
        if (!res || res.status !== "fulfilled") return pathFallback;
        try {
          const d = res.value.data;
          return d.products || d.orders || d.users || d.data || [];
        } catch {
          return pathFallback;
        }
      };

      const products     = getData(results[0], []);
      const placedOrders = getData(results[1], []);
      const history      = getData(results[2], []);
      const users        = getData(results[3], []);

      const revenueFromHistory = history
        .filter((o) => !o.refundExcludeFromRevenue)
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

      const revenueFromPlaced = placedOrders
        .filter((o) => o.paid)
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

      const totalRevenue  = revenueFromHistory + revenueFromPlaced;
      const refundedTotal = history
        .filter((o) => o.refundExcludeFromRevenue)
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

      const outOfStockCount = products.filter((p) => p.stock === 0).length;
      const lowStockCount   = products.filter((p) => p.stock > 0 && p.stock < 5).length;
      const totalStockValue = products.reduce((s, p) => s + (p.price * p.stock), 0);

      const pendingCount    = placedOrders.filter((o) => o.deliveryStatus === "pending").length;
      const processingCount = placedOrders.filter((o) => o.deliveryStatus === "processing").length;
      const shippedCount    = placedOrders.filter((o) => o.deliveryStatus === "shipped" || o.deliveryStatus === "in transit").length;
      const cancelledCount  = history.filter((o) => o.cancelled).length;
      const completedCount  = history.filter((o) => !o.cancelled).length;

      const customerCount  = users.filter((u) => u.role === "customer").length;
      const wholesaleCount = users.filter((u) => u.role === "wholesale").length;
      const staffCount     = users.filter((u) => u.role === "staff").length;
      const adminCount     = users.filter((u) => u.role === "admin").length;

      setStats({
        totalRevenue, revenueFromHistory, revenueFromPlaced, refundedTotal,
        totalProducts: products.length, outOfStockCount, lowStockCount, totalStockValue,
        totalOrders: placedOrders.length + history.length, pendingCount, processingCount, shippedCount,
        cancelledCount, completedCount,
        totalUsers: users.length, customerCount, wholesaleCount, staffCount, adminCount,
      });
    } catch (err) {
      console.error("Summary fetch error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 md:py-6">
      <div className="max-w-7xl mx-auto px-3 md:px-6 space-y-6">

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time inventory & sales tracking</p>
          </div>
          <button onClick={fetchStats} disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-indigo-200 bg-white hover:bg-indigo-50 rounded-lg text-sm font-medium text-indigo-600 transition">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-50 border-l-4 border-red-500 rounded-lg px-5 py-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Failed to load dashboard data</p>
            <p>Please try refreshing or contact support if the issue persists.</p>
          </motion.div>
        )}

        {/* ── TOP KPIS ── */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Revenue" value={`₦${(stats.totalRevenue / 1000000).toFixed(1)}M`}
              icon={TrendingUp} color="bg-gradient-to-br from-green-500 to-emerald-600" sub="Net after refunds" trend={12} trendUp />
            <KPICard label="Active Orders" value={stats.totalOrders}
              icon={ShoppingBag} color="bg-gradient-to-br from-indigo-500 to-blue-600" sub={`${stats.pendingCount} pending`} trend={8} trendUp />
            <KPICard label="Inventory Value" value={`₦${(stats.totalStockValue / 1000000).toFixed(1)}M`}
              icon={Package} color="bg-gradient-to-br from-purple-500 to-pink-600" sub={`${stats.totalProducts} products`} />
            <KPICard label="Total Users" value={stats.totalUsers}
              icon={Users} color="bg-gradient-to-br from-amber-500 to-orange-600" sub={`${stats.customerCount} active`} />
          </div>
        )}

        {/* ── REVENUE SECTION ── */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-8 w-1 bg-green-500 rounded-full" />
            <h2 className="text-lg font-bold text-gray-900">Revenue Tracking</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Net Revenue" value={`₦${(stats?.totalRevenue || 0).toLocaleString()}`}
              icon={TrendingUp} color="text-green-600" bg="bg-green-50" sub="Completed & collected" loading={loading} />
            <StatCard label="Completed Revenue" value={`₦${(stats?.revenueFromHistory || 0).toLocaleString()}`}
              icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" sub="From delivered orders" loading={loading} />
            {(stats?.refundedTotal || 0) > 0 && (
              <StatCard label="Refunded Orders" value={`₦${(stats?.refundedTotal || 0).toLocaleString()}`}
                icon={AlertTriangle} color="text-purple-600" bg="bg-purple-50" sub="Excluded from revenue" loading={loading} />
            )}
          </div>
        </motion.section>

        {/* ── ORDERS & FULFILLMENT ── */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-8 w-1 bg-indigo-500 rounded-full" />
              <h2 className="text-lg font-bold text-gray-900">Order Status</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <StatCard label="Pending" value={stats?.pendingCount || 0}
                icon={Clock} color="text-amber-600" bg="bg-amber-50" sub="Awaiting shipment" loading={loading} />
              <StatCard label="Processing" value={stats?.processingCount || 0}
                icon={Zap} color="text-blue-600" bg="bg-blue-50" sub="In progress" loading={loading} />
              <StatCard label="In Transit" value={stats?.shippedCount || 0}
                icon={Target} color="text-cyan-600" bg="bg-cyan-50" sub="On the way" loading={loading} />
              <StatCard label="Completed" value={stats?.completedCount || 0}
                icon={TrendingUp} color="text-green-600" bg="bg-green-50" sub="Delivered" loading={loading} />
            </div>
          </div>
          {!loading && stats && (
            <MiniChart title="Order Distribution" items={[
              { label: 'Pending', value: stats.pendingCount, max: Math.max(stats.pendingCount, stats.processingCount, stats.shippedCount, stats.completedCount) || 1 },
              { label: 'Processing', value: stats.processingCount, max: Math.max(stats.pendingCount, stats.processingCount, stats.shippedCount, stats.completedCount) || 1 },
              { label: 'In Transit', value: stats.shippedCount, max: Math.max(stats.pendingCount, stats.processingCount, stats.shippedCount, stats.completedCount) || 1 },
              { label: 'Completed', value: stats.completedCount, max: Math.max(stats.pendingCount, stats.processingCount, stats.shippedCount, stats.completedCount) || 1 },
            ]}
              colors={['bg-amber-500', 'bg-blue-500', 'bg-cyan-500', 'bg-green-500']} />
          )}
        </motion.section>

        {/* ── INVENTORY MANAGEMENT ── */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-8 w-1 bg-purple-500 rounded-full" />
            <h2 className="text-lg font-bold text-gray-900">Inventory Management</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Products" value={stats?.totalProducts || 0}
              icon={Package} color="text-blue-600" bg="bg-blue-50" loading={loading} />
            <StatCard label="Stock Value" value={`₦${(stats?.totalStockValue || 0).toLocaleString()}`}
              icon={TrendingUp} color="text-green-600" bg="bg-green-50" sub="Current inventory value" loading={loading} />
            <StatCard label="Low Stock ⚠️" value={stats?.lowStockCount || 0}
              icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50" sub="Less than 5 units" loading={loading} />
            <StatCard label="Out of Stock" value={stats?.outOfStockCount || 0}
              icon={AlertTriangle} color="text-red-600" bg="bg-red-50" sub="Need restock urgently" loading={loading} />
          </div>
          {(stats?.cancelledCount || 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-4 bg-red-50 border-l-4 border-red-500 rounded-lg px-5 py-3.5 text-sm text-red-700">
              <p className="font-semibold mb-1">⚠️ Action Required: {stats.cancelledCount} Cancelled Order{stats.cancelledCount !== 1 ? 's' : ''}</p>
              <p className="text-red-600">Navigate to <strong>Admin History</strong> to process refunds and mark them as completed.</p>
            </motion.div>
          )}
        </motion.section>

        {/* ── USER DISTRIBUTION ── */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h2 className="text-lg font-bold text-gray-900">User Base</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <StatCard label="Total Users" value={stats?.totalUsers || 0}
                icon={Users} color="text-gray-600" bg="bg-gray-50" loading={loading} />
              <StatCard label="Customers" value={stats?.customerCount || 0}
                icon={Users} color="text-green-600" bg="bg-green-50" sub="Retail buyers" loading={loading} />
              <StatCard label="Wholesale" value={stats?.wholesaleCount || 0}
                icon={Users} color="text-amber-600" bg="bg-amber-50" sub="Bulk purchases" loading={loading} />
              <StatCard label="Staff" value={stats?.staffCount || 0}
                icon={Users} color="text-blue-600" bg="bg-blue-50" sub="Assistants" loading={loading} />
            </div>
            {!loading && stats && (
              <MiniChart title="User Types" items={[
                { label: 'Customers', value: stats.customerCount, max: stats.totalUsers || 1 },
                { label: 'Wholesale', value: stats.wholesaleCount, max: stats.totalUsers || 1 },
                { label: 'Staff', value: stats.staffCount, max: stats.totalUsers || 1 },
                { label: 'Admin', value: stats.adminCount, max: stats.totalUsers || 1 },
              ]}
                colors={['bg-green-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-500']} />
            )}
          </div>
        </motion.section>

        {/* ── FOOTER ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
          <p>Last updated: {new Date().toLocaleString()}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Summary;

