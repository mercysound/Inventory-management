import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import {
  ShoppingBag, Package, Users, TrendingUp,
  AlertTriangle, Clock, RefreshCw,
} from "lucide-react";

const StatCard = ({ label, value, icon: Icon, color, bg, sub, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`${bg} rounded-2xl p-5 border border-white shadow-sm flex items-start gap-4`}
  >
    <div className={`p-3 rounded-xl ${color} bg-white/60 flex-shrink-0`}>
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      {loading ? (
        <div className="h-7 w-24 bg-white/60 rounded-lg animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 leading-tight truncate">{value}</p>
      )}
      {sub && !loading && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
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

      const [productsRes, placedRes, historyRes, usersRes] = await Promise.all([
        axiosInstance.get("/products"),
        axiosInstance.get("/placed-orders"),
        axiosInstance.get("/completed-history"),
        axiosInstance.get("/users"),
      ]);

      const products     = productsRes.data.products || [];
      const placedOrders = placedRes.data.orders     || [];
      const history      = historyRes.data.orders    || [];
      const users        = usersRes.data.users       || [];

      // Revenue — exclude refunded orders
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
      const cancelledCount  = history.filter((o) => o.cancelled).length;
      const completedCount  = history.filter((o) => !o.cancelled).length;

      const customerCount  = users.filter((u) => u.role === "customer").length;
      const wholesaleCount = users.filter((u) => u.role === "wholesale").length;
      const staffCount     = users.filter((u) => u.role === "staff").length;
      const adminCount     = users.filter((u) => u.role === "admin").length;

      setStats({
        totalRevenue, revenueFromHistory, revenueFromPlaced, refundedTotal,
        totalProducts: products.length, outOfStockCount, lowStockCount, totalStockValue,
        totalOrders: placedOrders.length, pendingCount, processingCount,
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
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your inventory system</p>
        </div>
        <button onClick={fetchStats} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load dashboard data. Please refresh.
        </div>
      )}

      {/* Revenue */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Net Revenue"     value={`₦${(stats?.totalRevenue || 0).toLocaleString()}`}        icon={TrendingUp}   color="text-green-600"   bg="bg-green-50"   sub="Excludes refunded orders" loading={loading} />
          <StatCard label="Collected Revenue"     value={`₦${(stats?.revenueFromHistory || 0).toLocaleString()}`}  icon={TrendingUp}   color="text-emerald-600" bg="bg-emerald-50" sub="From completed deliveries" loading={loading} />
          {(stats?.refundedTotal || 0) > 0 && (
            <StatCard label="Refunded (excluded)" value={`₦${(stats?.refundedTotal || 0).toLocaleString()}`}        icon={AlertTriangle} color="text-purple-600"  bg="bg-purple-50"  sub="Not counted in revenue"   loading={loading} />
          )}
        </div>
      </section>

      {/* Orders */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Orders</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Active Orders" value={stats?.totalOrders    || 0} icon={ShoppingBag}  color="text-indigo-600" bg="bg-indigo-50" sub="Awaiting delivery" loading={loading} />
          <StatCard label="Pending"       value={stats?.pendingCount   || 0} icon={Clock}        color="text-amber-600"  bg="bg-amber-50"  loading={loading} />
          <StatCard label="Processing"    value={stats?.processingCount|| 0} icon={RefreshCw}    color="text-blue-600"   bg="bg-blue-50"   loading={loading} />
          <StatCard label="Completed"     value={stats?.completedCount || 0} icon={ShoppingBag}  color="text-green-600"  bg="bg-green-50"  loading={loading} />
        </div>
        {(stats?.cancelledCount || 0) > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle size={13} />
            <span>
              <strong>{stats.cancelledCount}</strong> cancelled order{stats.cancelledCount !== 1 ? "s" : ""} in history.
              Check <strong>Admin History</strong> to mark refunds.
            </span>
          </div>
        )}
      </section>

      {/* Inventory */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Inventory</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Products" value={stats?.totalProducts  || 0}                                icon={Package}      color="text-blue-600"   bg="bg-blue-50"   loading={loading} />
          <StatCard label="Stock Value"    value={`₦${(stats?.totalStockValue || 0).toLocaleString()}`}     icon={TrendingUp}   color="text-green-600"  bg="bg-green-50"  loading={loading} />
          <StatCard label="Low Stock"      value={stats?.lowStockCount  || 0}                                icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50"  sub="Less than 5 units" loading={loading} />
          <StatCard label="Out of Stock"   value={stats?.outOfStockCount|| 0}                                icon={AlertTriangle} color="text-red-600"   bg="bg-red-50"    loading={loading} />
        </div>
      </section>

      {/* Users */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats?.totalUsers    || 0} icon={Users} color="text-gray-600"   bg="bg-gray-50"   loading={loading} />
          <StatCard label="Customers"   value={stats?.customerCount || 0} icon={Users} color="text-green-600"  bg="bg-green-50"  loading={loading} />
          <StatCard label="Wholesale"   value={stats?.wholesaleCount|| 0} icon={Users} color="text-amber-600"  bg="bg-amber-50"  loading={loading} />
          <StatCard label="Staff"       value={stats?.staffCount    || 0} icon={Users} color="text-blue-600"   bg="bg-blue-50"   loading={loading} />
        </div>
      </section>
    </div>
  );
};

export default Summary;
