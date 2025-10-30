import React, { useEffect, useState } from "react";
import {
  FaBox,
  FaCog,
  FaHome,
  FaShoppingCart,
  FaSignOutAlt,
  FaTable,
  FaTruck,
  FaUsers,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const adminMenu = [
    { name: "Dashboard", path: "/admin-dashboard", icon: <FaHome /> },
    { name: "Categories", path: "/admin-dashboard/categories", icon: <FaTable /> },
    { name: "Products", path: "/admin-dashboard/products", icon: <FaBox /> },
    { name: "Suppliers", path: "/admin-dashboard/suppliers", icon: <FaTruck /> },
    { name: "Placed Orders", path: "/admin-dashboard/placed-orders", icon: <FaShoppingCart /> },
    { name: "Users", path: "/admin-dashboard/users", icon: <FaUsers /> },
    { name: "Profile", path: "/admin-dashboard/profile", icon: <FaCog /> },
    { name: "Logout", path: "/admin-dashboard/logout", icon: <FaSignOutAlt /> },
  ];

  const customerMenu = [
    { name: "Products", path: "/customer-dashboard", icon: <FaBox /> },
    { name: "Orders", path: "/customer-dashboard/orders", icon: <FaShoppingCart /> },
    { name: "Profile", path: "/customer-dashboard/profile", icon: <FaCog /> },
    { name: "Logout", path: "/customer-dashboard/logout", icon: <FaSignOutAlt /> },
  ];

  const { user } = useAuth();
  const [menuLinks, setMenuLinks] = useState(customerMenu);

  useEffect(() => {
    if (user && user.role === "admin") {
      setMenuLinks(adminMenu);
    }
  }, [user]);

  return (
    <>
      {/* Sidebar for Desktop and Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-lg flex flex-col z-40"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between border-b border-gray-700 px-4">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                MELECH SH
              </span>
              {/* Mobile Close Button */}
              <button
                onClick={toggleSidebar}
                className="md:hidden p-1 rounded hover:bg-gray-700 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Menu */}
            <ul className="flex-1 overflow-y-auto p-4 space-y-2">
              {menuLinks.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    end
                    onClick={() => window.innerWidth < 768 && toggleSidebar()} // close on mobile click
                    className={({ isActive }) =>
                      `flex items-center p-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-500 to-pink-500 shadow-md"
                          : "hover:bg-gray-700"
                      }`
                    }
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="ml-3 font-medium">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 text-center text-gray-400 text-sm">
              © {new Date().getFullYear()} MELECH SH
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
