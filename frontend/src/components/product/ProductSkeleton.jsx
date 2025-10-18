import React from "react";

const ProductSkeleton = () => {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-6 bg-gray-300 w-1/3 rounded"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-200 rounded"></div>
      ))}
    </div>
  );
};

export default ProductSkeleton;
