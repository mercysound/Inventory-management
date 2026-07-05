// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/share-component/sidebar/Sidebar";
import FloatingCartButton from "../components/share-component/cart/FloatingCartButton";
import FloatingScrollButtons from "../components/share-component/scroll/FloatingScrollButtons";
import PullToRefresh from "../components/share-component/PullToRefresh";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";

// ── Route → display name map ──────────────────────────────────────────────────
const PAGE_NAME_MAP = [
  { match: /\/products$/,          label: "Products"        },
  { match: /\/categories/,         label: "Categories"      },
  { match: /\/suppliers/,          label: "Suppliers"       },
  { match: /\/placed-orders/,      label: "Placed Orders"   },
  { match: /\/completed-history/,  label: "History"         },
  { match: /\/expiring-orders/,    label: "Expiring Orders" },
  { match: /\/engagement/,         label: "Engagement"      },
  { match: /\/users/,              label: "Users"           },
  { match: /\/settings/,           label: "Settings"        },
  { match: /\/orders/,             label: "Cart"            },
  { match: /\/logout/,             label: "Logout"          },
  { match: /\/dashboard$/,         label: "Dashboard"       },
  { match: /\/$/,                  label: "Dashboard"       },
];

const getPageName = (pathname) => {
  for (const { match, label } of PAGE_NAME_MAP) {
    if (match.test(pathname)) return label;
  }
  return "Dashboard";
};

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
  const { user, logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const pageName   = getPageName(location.pathname);

  // Store name from settings (editable by admin)
  const [storeName, setStoreName] = useState("MELECH SH");
  useEffect(() => {
    // /settings/theme is public — safe for all roles
    // /settings is admin-only — only fetch for admin to avoid 403 for other users
    if (user?.role === "admin") {
      axiosInstance.get("/settings")
        .then((res) => {
          if (res?.data?.settings?.storeName) setStoreName(res.data.settings.storeName);
        })
        .catch(() => {});
    } else {
      // Non-admin: fetch store name from contact-info (public endpoint)
      axiosInstance.get("/settings/contact-info")
        .then((res) => {
          if (res?.data?.storeName) setStoreName(res.data.storeName);
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const [isOpen, setIsOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    // Sync sidebar state on resize
    const handleResize = () => setIsOpen(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Fix scroll hang after app resume (Page Visibility API) ───────────────
  // When the user switches away and back, iOS Safari sometimes suspends
  // requestAnimationFrame and scroll events. Force a tiny re-paint on
  // visibility restore to unblock the browser's rendering pipeline.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const el = document.getElementById("main-scroll");
        if (el) {
          // Nudge the element to force a repaint — 0-cost layout trick
          const st = el.scrollTop;
          el.scrollTop = st + 1;
          el.scrollTop = st;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const toggleSidebar = () => setIsOpen((p) => !p);

  // Scroll #main-scroll to top on every route change
  useEffect(() => {
    const el = document.getElementById("main-scroll");
    if (el) el.scrollTop = 0;
  }, [location.pathname]);

  // Pull-to-refresh: navigate to same path to trigger data re-fetch
  const handlePullRefresh = useCallback(async () => {
    // Small delay so the spinner is visible
    await new Promise((r) => setTimeout(r, 600));
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

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
        {/* Mobile top bar — always above content, never collapses */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 shadow-md"
          style={{
            background: "var(--bg-sidebar, linear-gradient(to right, #111827, #1f2937))",
            color: "#fff",
            minHeight: "56px",
            height: "56px",
            flexShrink: 0,
            flexGrow: 0,
            position: "relative",
            zIndex: 60,
          }}
        >
          <button
            onClick={toggleSidebar}
            className="p-2 rounded hover:bg-white/10 active:bg-white/20 transition shrink-0"
            style={{ color: "#fff" }}
            aria-label="Open menu"
          >
            <FaBars size={20} />
          </button>
          {/* Store name + current page */}
          <div className="flex flex-col items-center min-w-0 flex-1 px-2">
            <span className="font-bold text-white text-sm leading-tight truncate max-w-[180px]">
              {storeName}
            </span>
            <span className="text-white/60 text-[10px] font-medium tracking-wide uppercase">
              {pageName}
            </span>
          </div>
          <div className="shrink-0">
            {user?.role === "admin" ? <ExpiryBell /> : <div className="w-9" />}
          </div>
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
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
            willChange: "scroll-position",
            transform: "translateZ(0)",
            minHeight: 0,
          }}
        >
          <div className="flex flex-col min-h-full">
            <div className="flex-1">
              <Outlet />
            </div>

            {/* ── App Footer ── */}
            <footer className="mt-12 pt-6 pb-8 border-t border-gray-200 dark:border-gray-700">
              <div className="max-w-2xl mx-auto px-4 text-center">

                {/* Branding — centered */}
                <div className="flex flex-col items-center gap-1 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600
                    flex items-center justify-center shadow-sm">
                    <span className="text-white font-black text-sm">M</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-1">
                    {storeName}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    Smart inventory &amp; sales management
                  </p>
                </div>

                {/* Quick links — centered, clickable, role-specific */}
                <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-5">
                  {(() => {
                    const role = user?.role;
                    const base =
                      role === "admin"       ? "/admin-dashboard"
                      : role === "staff"     ? "/customer-dashboard"
                      : role === "wholesale" ? "/wholesale-dashboard"
                      : "/user-dashboard";

                    // Admin gets all sidebar routes
                    const adminLinks = [
                      { label: "Dashboard",      path: "/admin-dashboard" },
                      { label: "Categories",     path: "/admin-dashboard/categories" },
                      { label: "Products",       path: "/admin-dashboard/products" },
                      { label: "Suppliers",      path: "/admin-dashboard/suppliers" },
                      { label: "Placed Orders",  path: "/admin-dashboard/placed-orders" },
                      { label: "History",        path: "/admin-dashboard/completed-history" },
                      { label: "Users",          path: "/admin-dashboard/users" },
                      { label: "Expiring Orders",path: "/admin-dashboard/expiring-orders" },
                      { label: "Engagement",     path: "/admin-dashboard/engagement" },
                      { label: "Settings",       path: "/admin-dashboard/settings" },
                      { label: "Logout",         path: `${base}/logout` },
                    ];

                    // Staff, customer, wholesale — no Dashboard link
                    const userLinks = [
                      { label: "Products",  path: base },
                      { label: "Cart",      path: `${base}/orders` },
                      { label: "History",   path: `${base}/completed-history` },
                      { label: "Settings",  path: `${base}/settings` },
                      { label: "Logout",    path: `${base}/logout` },
                    ];

                    const links = role === "admin" ? adminLinks : userLinks;

                    return links.map(({ label, path }) => (
                      <button
                        key={label}
                        onClick={() => navigate(path)}
                        className={`text-xs font-medium transition
                          ${label === "Logout"
                            ? "text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            : "text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          }`}
                      >
                        {label}
                      </button>
                    ));
                  })()}
                </nav>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-gray-800 mb-4" />

                {/* Bottom row — copyright + status — centered */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    © {new Date().getFullYear()}{" "}
                    <span className="font-semibold text-gray-500 dark:text-gray-400">
                      Melech Solution Hub
                    </span>. All rights reserved.
                  </p>
                  <span className="hidden sm:inline text-gray-300 dark:text-gray-700">·</span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    All systems operational
                  </span>
                  <span className="text-[10px] text-gray-300 dark:text-gray-700">v1.0</span>
                </div>

              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Floating cart — non-admin users on any non-cart page */}
      <FloatingCartButton />
      {/* Scroll up/down floating buttons — all users, all pages */}
      <FloatingScrollButtons />
      {/* Pull-to-refresh — works from anywhere on the page, not just the top */}
      <PullToRefresh onRefresh={handlePullRefresh} />
    </div>
  );
};

export default Dashboard;
