import React from "react";

const SupplierSkeleton = () => {
  return (
    <div className="animate-pulse">
      <div className="h-6 bg-gray-300 rounded mb-4 w-1/4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
        ))}
      </div>
    </div>
  );
};

export default SupplierSkeleton;
