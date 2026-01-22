// Product/DeletedProductsSkeleton.jsx
import React from "react";

const DeletedProductsSkeleton = () => {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="animate-pulse flex items-center gap-4 border p-2 rounded"
        >
          <div className="w-12 h-12 bg-gray-200 rounded"></div>
          <div className="flex-1 h-5 bg-gray-200 rounded"></div>
          <div className="w-24 h-5 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
};

export default DeletedProductsSkeleton;
