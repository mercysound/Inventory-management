import React, { useEffect, useState } from "react";
import {
  FaBox, FaCog, FaHome, FaShoppingCart, FaSignOutAlt, FaTable, FaTruck,FaUsers, FaTimes, FaHistory 
} from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../context/AuthContext";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const adminMenu = [
    { name: "Dashboard", path: "/admin-dashboard", icon: <FaHome /> },
    { name: "Categories", path: "/admin-dashboard/categories", icon: <FaTable /> },
    { name: "Products", path: "/admin-dashboard/products", icon: <FaBox /> },
    { name: "Suppliers", path: "/admin-dashboard/suppliers", icon: <FaTruck /> },
    { name: "Placed Orders", path: "/admin-dashboard/placed-orders", icon: <FaShoppingCart /> },
    { name: "History", path: "/admin-dashboard/completed-history", icon: <FaHistory /> },
    { name: "Users", path: "/admin-dashboard/users", icon: <FaUsers /> },
    { name: "Profile", path: "/admin-dashboard/profile", icon: <FaCog /> },
    { name: "Logout", path: "/logout", icon: <FaSignOutAlt /> },
  ];

  const customerMenu = [
    { name: "Products", path: "/customer-dashboard", icon: <FaBox /> },
    { name: "Cart", path: "/customer-dashboard/orders", icon: <FaShoppingCart /> },
    { name: "History", path: "/customer-dashboard/completed-history", icon: <FaHistory  /> }, //
    { name: "Profile", path: "/customer-dashboard/profile", icon: <FaCog /> },
    { name: "Logout", path: "/logout", icon: <FaSignOutAlt /> },
  ];

  const customerUserMenu = [
    { name: "Products", path: "/user-dashboard", icon: <FaBox /> },
    { name: "Cart", path: "/user-dashboard/orders", icon: <FaShoppingCart /> },
    { name: "History", path: "/user-dashboard/completed-history", icon: <FaHistory  /> },
    { name: "Profile", path: "/user-dashboard/profile", icon: <FaCog /> },
    { name: "Logout", path: "/logout", icon: <FaSignOutAlt /> },
  ];

  const [menuLinks, setMenuLinks] = useState(customerMenu);

  useEffect(() => {
    if (user?.role === "admin") setMenuLinks(adminMenu);
    else if (user?.role === "staff") setMenuLinks(customerMenu);
    else if (user?.role === "customer") setMenuLinks(customerUserMenu);
  }, [user]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: -250 }}
          animate={{ x: 0 }}
          exit={{ x: -250 }}
          transition={{ duration: 0.3 }}
          className="fixed md:static top-0 left-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white shadow-xl flex flex-col z-40 border-r border-white/5"
        >
          <div className="h-16 flex items-center justify-between border-b border-white/5 px-4">
            <span className="text-lg md:text-2xl font-bold text-emerald-400">
              MELECH SH
            </span>
            <button
              onClick={toggleSidebar}
              className="md:hidden p-1 rounded hover:bg-slate-800 transition"
            >
              <FaTimes />
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuLinks.map((item) => (
              <li key={item.name}>
                {item.name === "Logout" ? (
                  <button
                    onClick={async () => {
                      await logout();
                      toggleSidebar();
                      navigate("/", { replace: true });
                    }}
                    className="flex items-center w-full p-3 rounded-lg hover:bg-slate-800/50 transition-all duration-200 text-left text-slate-300 hover:text-white"
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
                          ? "bg-emerald-500/20 border-l-2 border-emerald-400 text-emerald-300"
                          : "text-slate-300 hover:bg-slate-800/30 hover:text-white"
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

          <div className="p-4 border-t border-white/5 text-center text-slate-500 text-xs">
            © {new Date().getFullYear()} MELECH SH
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
