import React from "react";

const ProductSkeleton = () => (
  <div className="w-full bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
    {/* Toolbar skeleton */}
    <div className="flex items-center justify-between p-4 border-b border-gray-100">
      <div className="animate-pulse flex gap-3">
        <div className="h-9 w-48 bg-gray-200 rounded-md" />
        <div className="h-9 w-36 bg-gray-200 rounded-md" />
      </div>
      <div className="animate-pulse flex gap-2">
        <div className="h-9 w-28 bg-gray-100 rounded-md" />
        <div className="h-9 w-32 bg-gray-200 rounded-md" />
      </div>
    </div>

    {/* Table header */}
    <div className="animate-pulse grid grid-cols-8 gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
      {["w-5", "w-8", "w-24", "w-20", "w-16", "w-12", "w-28", "w-16"].map((w, i) => (
        <div key={i} className={`h-3 bg-gray-200 rounded ${w}`} />
      ))}
    </div>

    {/* Row skeletons */}
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="animate-pulse grid grid-cols-8 items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-none"
        style={{ animationDelay: `${i * 80}ms` }}
      >
        <div className="h-3 bg-gray-100 rounded w-4" />
        <div className="w-10 h-10 bg-gray-200 rounded-md" />
        <div className="h-3 bg-gray-200 rounded w-28" />
        <div className="h-5 bg-gray-100 rounded-full w-20" />
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-5 bg-gray-100 rounded-full w-10" />
        <div className="h-3 bg-gray-100 rounded w-32" />
        <div className="flex gap-2">
          <div className="w-7 h-7 bg-gray-200 rounded-md" />
          <div className="w-7 h-7 bg-gray-200 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

export default ProductSkeleton;