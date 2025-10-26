// frontend/src/components/orders/CustomerSkeleton.jsx
import React from "react";

const CustomerSkeleton = () => {
  return (
    <div className="animate-pulse rounded-md p-4 border border-gray-200 bg-white">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 rounded" />
        <div className="h-6 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
};

export default CustomerSkeleton;
