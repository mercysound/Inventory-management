import React from "react";

const PlacedOrdersSkeleton = () => {
  return (
    <div className="w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 animate-pulse">
      <div className="h-12 bg-indigo-200 mb-4" />
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 bg-gray-200 rounded w-8" />
            <div className="h-8 bg-gray-200 rounded flex-1" />
            <div className="h-8 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlacedOrdersSkeleton;