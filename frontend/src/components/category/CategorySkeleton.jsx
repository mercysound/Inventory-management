import React from "react";

const CategorySkeleton = () => {
  return (
    <div className="p-5 animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-48 mb-6"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
        ))}
      </div>
    </div>
  );
};

export default CategorySkeleton;
