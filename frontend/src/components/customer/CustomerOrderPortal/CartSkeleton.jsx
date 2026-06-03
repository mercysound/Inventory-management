import React from "react";

const CartSkeleton = () => {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
          >
            <div className="w-9 h-9 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Desktop — table header */}
        <div className="hidden lg:grid grid-cols-6 gap-4 px-4 py-3 bg-indigo-600">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 bg-indigo-400/50 rounded animate-pulse" />
          ))}
        </div>

        {/* Desktop — table rows */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="hidden lg:grid grid-cols-6 gap-4 items-center px-4 py-4 border-b border-gray-100 last:border-0"
          >
            <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="flex justify-center">
              <div className="h-7 w-12 bg-indigo-100 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse ml-auto" />
            <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse ml-auto" />
            <div className="flex justify-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        ))}

        {/* Mobile — card rows */}
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="lg:hidden p-4 border-b border-gray-100 last:border-0 space-y-3"
          >
            <div className="w-full h-44 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
            <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
              <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-11 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>

      {/* Checkout footer */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-44 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-40 bg-indigo-100 rounded-xl animate-pulse" />
            <div className="h-12 w-44 bg-indigo-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

    </div>
  );
};

export default CartSkeleton;