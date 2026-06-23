// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/share-component/sidebar/Sidebar";
import FloatingCartButton from "../components/share-component/cart/FloatingCartButton";
import FloatingScrollButtons from "../components/share-component/scroll/FloatingScrollButtons";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";

// ── Expiry bell — admin only ───────────────────────────────────────────────────
const ExpiryBell = () => {
  const navigate  = useNavigate();
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/expiring-orders/count");
      if (res.data.success) {
        const newCount = res.data.count || 0;
        if (newCount > count) setPulse(true);
        setCount(newCount);
      }
    } catch { /* silently fail */ }
  }, [count]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    if (pulse) { const t = setTimeout(() => setPulse(false), 1000); return () => clearTimeout(t); }
  }, [pulse]);

  return (
    <button onClick={() => navigate("/admin-dashboard/expiring-orders")}
      className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
      title={count > 0 ? `${count} overdue` : "No overdue orders"}>
      <Clock size={18} className={count > 0 ? "text-amber-400" : "text-gray-400"} />
      <AnimatePresence>
        {count > 0 && (
          <motion.span key={count} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${pulse ? "bg-red-500" : "bg-amber-500"}`}>
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsOpen(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen((p) => !p);

  return (
    <div className="flex h-screen overflow-hidden theme-page">
      {/* Desktop sidebar */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0">
        <Sidebar isOpen={true} toggleSidebar={toggleSidebar} />
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
      )}
      <div className="md:hidden">
        <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile top bar — always uses the sidebar brand gradient so hamburger is always visible */}
        <div className="md:hidden flex items-center justify-between p-4 shadow-md theme-sidebar"
          style={{ color: "#fff" }}>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded hover:bg-white/10 transition"
            style={{ color: "#fff" }}
            aria-label="Open menu"
          >
            <FaBars size={20} />
          </button>
          <span className="font-bold text-white">MELECH SH Dashboard</span>
          {user?.role === "admin" && <ExpiryBell />}
        </div>

        {/* Desktop top bar — admin only */}
        {user?.role === "admin" && (
          <div className="hidden md:flex items-center justify-end px-6 py-2 border-b shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">Overdue orders:</span>
              <ExpiryBell />
            </div>
          </div>
        )}

        {/* Route outlet */}
        <main
          id="main-scroll"
          data-scroll-root
          className="flex-1 p-4 md:p-6 overflow-y-auto theme-page"
          style={{
            WebkitOverflowScrolling: "touch",  // iOS momentum scrolling
            scrollBehavior: "smooth",
            overscrollBehaviorY: "contain",    // prevent page bounce at scroll edges
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Floating cart — non-admin users on any non-cart page */}
      <FloatingCartButton />
      {/* Scroll up/down floating buttons — all users, all pages */}
      <FloatingScrollButtons />
    </div>
  );
};

export default Dashboard;
