// src/components/orders/PlacedOrdersSkeleton.jsx
import React from "react";

const PlacedOrdersSkeleton = () => {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-10 bg-gray-200 rounded-md w-full shadow-sm"
        ></div>
      ))}
    </div>
  );
};

export default PlacedOrdersSkeleton;
