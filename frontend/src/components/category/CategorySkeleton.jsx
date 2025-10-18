// src/components/Category/CategorySkeleton.jsx
import React from "react";

const CategorySkeleton = () => {
  return (
    <div className="p-5 animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-48 mb-6"></div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
        ))}
      </div>
    </div>
  );
};

export default CategorySkeleton;
