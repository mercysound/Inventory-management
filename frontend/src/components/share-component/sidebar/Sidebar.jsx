import React from "react";
import {
  FaBox, FaCog, FaHome, FaShoppingCart, FaSignOutAlt,
  FaTable, FaTruck, FaUsers, FaTimes, FaHistory, FaClipboardList,
} from "react-icons/fa";
import { Clock } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../context/AuthContext";
import { useDelegation } from "../../../hooks/useDelegation";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Delegation status — only fetches when user is staff
  const { isDelegated } = useDelegation();

  const adminMenu = [
    { name: "Dashboard",       path: "/admin-dashboard",                    icon: <FaHome /> },
    { name: "Categories",      path: "/admin-dashboard/categories",         icon: <FaTable /> },
    { name: "Products",        path: "/admin-dashboard/products",           icon: <FaBox /> },
    { name: "Suppliers",       path: "/admin-dashboard/suppliers",          icon: <FaTruck /> },
    { name: "Placed Orders",   path: "/admin-dashboard/placed-orders",      icon: <FaShoppingCart /> },
    { name: "History",         path: "/admin-dashboard/completed-history",  icon: <FaHistory /> },
    { name: "Users",           path: "/admin-dashboard/users",              icon: <FaUsers /> },
    // ✅ Expiring Orders — amber clock icon to draw attention
    { name: "Expiring Orders", path: "/admin-dashboard/expiring-orders",    icon: <Clock size={16} className="text-amber-400" />, highlight: true },
    // ✅ Settings page
    { name: "Settings",        path: "/admin-dashboard/settings",           icon: <FaCog /> },
    { name: "Profile",         path: "/admin-dashboard/profile",            icon: <FaCog /> },
    { name: "Logout",          path: "/logout",                             icon: <FaSignOutAlt /> },
  ];

  const staffMenuBase = [
    { name: "Products",     path: "/customer-dashboard",                   icon: <FaBox /> },
    { name: "Cart",         path: "/customer-dashboard/orders",            icon: <FaShoppingCart /> },
    { name: "History",      path: "/customer-dashboard/completed-history", icon: <FaHistory /> },
    { name: "Profile",      path: "/customer-dashboard/profile",           icon: <FaCog /> },
    { name: "Logout",       path: "/logout",                               icon: <FaSignOutAlt /> },
  ];

  // Inject "Placed Orders" item right before Profile when staff is delegated
  const staffMenu = isDelegated
    ? [
        { name: "Products",      path: "/customer-dashboard",                   icon: <FaBox /> },
        { name: "Cart",          path: "/customer-dashboard/orders",            icon: <FaShoppingCart /> },
        { name: "Placed Orders", path: "/customer-dashboard/placed-orders",     icon: <FaClipboardList />, highlight: true },
        { name: "History",       path: "/customer-dashboard/completed-history", icon: <FaHistory /> },
        { name: "Profile",       path: "/customer-dashboard/profile",           icon: <FaCog /> },
        { name: "Logout",        path: "/logout",                               icon: <FaSignOutAlt /> },
      ]
    : staffMenuBase;

  const customerMenu = [
    { name: "Products", path: "/user-dashboard",                   icon: <FaBox /> },
    { name: "Cart",     path: "/user-dashboard/orders",            icon: <FaShoppingCart /> },
    { name: "History",  path: "/user-dashboard/completed-history", icon: <FaHistory /> },
    { name: "Profile",  path: "/user-dashboard/profile",           icon: <FaCog /> },
    { name: "Logout",   path: "/logout",                           icon: <FaSignOutAlt /> },
  ];

  // ✅ Wholesale menu — same structure as customer but uses /wholesale-dashboard
  const wholesaleMenu = [
    { name: "Products", path: "/wholesale-dashboard",                   icon: <FaBox /> },
    { name: "Cart",     path: "/wholesale-dashboard/orders",            icon: <FaShoppingCart /> },
    { name: "History",  path: "/wholesale-dashboard/completed-history", icon: <FaHistory /> },
    { name: "Profile",  path: "/wholesale-dashboard/profile",           icon: <FaCog /> },
    { name: "Logout",   path: "/logout",                                icon: <FaSignOutAlt /> },
  ];

  // Derive menu links directly — no useState needed, recomputes when
  // user role or isDelegated (for staff) changes.
  const menuLinks = (() => {
    if (user?.role === "admin")     return adminMenu;
    if (user?.role === "staff")     return staffMenu;
    if (user?.role === "customer")  return customerMenu;
    if (user?.role === "wholesale") return wholesaleMenu;
    return [];
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: -250 }}
          animate={{ x: 0 }}
          exit={{ x: -250 }}
          transition={{ duration: 0.3 }}
          className="fixed md:static top-0 left-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-lg flex flex-col z-40"
        >
          {/* Header */}
          <div className="h-16 flex items-center justify-between border-b border-gray-700 px-4">
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                MELECH SH
              </span>
              {user?.role === "admin" && (
                <span className="text-[10px] bg-red-500 text-white rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide">
                  Admin
                </span>
              )}
              {user?.role === "staff" && (
                <span className="text-[10px] bg-indigo-500 text-white rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide">
                  Staff
                </span>
              )}
              {user?.role === "customer" && (
                <span className="text-[10px] bg-green-500 text-white rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide">
                  Customer
                </span>
              )}
              {user?.role === "wholesale" && (
                <span className="text-[10px] bg-amber-500 text-white rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide">
                  Wholesale
                </span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="md:hidden p-1 rounded hover:bg-gray-700 transition"
            >
              <FaTimes />
            </button>
          </div>

          {/* Nav links */}
          <ul className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuLinks.map((item) => (
              <li key={item.name}>
                {item.name === "Logout" ? (
                  <button
                    onClick={() => {
                      logout();
                      toggleSidebar();
                      navigate("/");
                    }}
                    className="flex items-center w-full p-3 rounded-lg hover:bg-gray-700 transition-all duration-200 text-left"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="ml-3 font-medium">{item.name}</span>
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    end
                    onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    className={({ isActive }) =>
                      `flex items-center p-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-500 to-pink-500 shadow-md"
                          : item.highlight
                          ? "hover:bg-amber-900/40 text-amber-300"
                          : "hover:bg-gray-700"
                      }`
                    }
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="ml-3 font-medium">{item.name}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>

          <div className="p-4 border-t border-gray-700 text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} MELECH SH
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
