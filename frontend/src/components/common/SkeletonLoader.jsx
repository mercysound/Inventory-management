import React from "react";

const SkeletonLoader = ({ rows = 5 }) => {
  return (
    <div className="animate-pulse space-y-3 mt-4">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex justify-between items-center bg-gray-100 rounded-lg p-3"
        >
          <div className="w-1/3 h-4 bg-gray-300 rounded"></div>
          <div className="w-1/4 h-4 bg-gray-300 rounded"></div>
          <div className="w-1/5 h-4 bg-gray-300 rounded"></div>
          <div className="w-1/6 h-4 bg-gray-300 rounded"></div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
