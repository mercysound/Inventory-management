import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import Sidebar from "../components/share-component/sidebar/Sidebar";

const Dashboard = () => {
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - Fixed on mobile, relative on desktop */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0">
        <Sidebar isOpen={true} toggleSidebar={toggleSidebar} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
      )}
      <div className="md:hidden">
        <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900 text-white shadow-md">
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded hover:bg-gray-800">
            <FaBars size={20} />
          </button>
          <span className="font-bold">MELECH SH Dashboard</span>
        </div>

        {/* Nested Route Outlet */}
        <main className="flex-1 bg-gray-100 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
