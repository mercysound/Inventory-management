import React from "react";

const DashboardSkeleton = () => {
  return (
    <div role="status" className="p-5 animate-pulse">
      <h2 className="text-3xl font-bold mb-6 bg-gray-300 h-8 w-48 rounded"></h2>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {[1, 2, 3, 4].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 p-4 rounded-lg shadow-md flex flex-col items-center justify-center h-28"
          >
            <div className="bg-gray-300 h-5 w-32 rounded mb-3"></div>
            <div className="bg-gray-400 h-6 w-20 rounded"></div>
          </div>
        ))}
      </div>

      {/* Bottom 3 sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((_, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-between"
          >
            <div className="bg-gray-300 h-6 w-40 rounded mb-3"></div>
            <div className="space-y-2">
              <div className="bg-gray-200 h-4 rounded w-full"></div>
              <div className="bg-gray-200 h-4 rounded w-5/6"></div>
              <div className="bg-gray-200 h-4 rounded w-4/6"></div>
              <div className="bg-gray-200 h-4 rounded w-3/6"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
