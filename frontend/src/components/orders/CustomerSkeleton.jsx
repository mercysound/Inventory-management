import React from "react";

const CustomerSkeleton = () => {
  return (
    <div className="animate-pulse bg-gray-100 rounded-lg p-4">
      <div className="h-5 bg-gray-300 rounded w-3/4 mb-3"></div>
      <div className="h-5 bg-gray-300 rounded w-1/2 mb-3"></div>
      <div className="h-5 bg-gray-300 rounded w-full mb-3"></div>
    </div>
  );
};

export default CustomerSkeleton;
