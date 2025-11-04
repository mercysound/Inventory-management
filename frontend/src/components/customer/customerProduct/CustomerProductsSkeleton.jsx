import React from "react";

const CustomerProductsSkeleton = () => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-gray-300 rounded w-1/3"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
};

export default CustomerProductsSkeleton;
