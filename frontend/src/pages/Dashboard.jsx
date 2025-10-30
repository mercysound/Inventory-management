import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { FaBars } from "react-icons/fa";

const Dashboard = () => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-0"
        }`}
      >
        {/* Top Bar for Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900 text-white shadow-md">
          <button onClick={toggleSidebar} className="p-2 rounded hover:bg-gray-800">
            <FaBars size={20} />
          </button>
          <span className="font-bold">MELECH SH Dashboard</span>
        </div>

        {/* Outlet Content */}
        <main className="flex-1 bg-gray-100 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
