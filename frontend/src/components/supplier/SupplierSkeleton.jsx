import React from "react";

const SupplierSkeleton = () => {
  return (
    <div className="animate-pulse space-y-4 mt-4">
      <div className="h-6 bg-gray-300 rounded w-1/3 sm:w-1/4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded w-full sm:w-[90%] mx-auto"
          ></div>
        ))}
      </div>
    </div>
  );
};

export default SupplierSkeleton;
