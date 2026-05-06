import React from "react";

const DeletedProductsSkeleton = () => (
  <div className="flex flex-col gap-3 p-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="animate-pulse flex items-center gap-3 border border-gray-100 rounded-lg p-3 bg-white"
      >
        <div className="w-10 h-10 bg-gray-200 rounded-md flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3.5 bg-gray-200 rounded w-3/5" />
          <div className="h-3 bg-gray-100 rounded w-2/5" />
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded-md" />
        <div className="h-8 w-24 bg-gray-200 rounded-md" />
      </div>
    ))}
  </div>
);

export default DeletedProductsSkeleton;