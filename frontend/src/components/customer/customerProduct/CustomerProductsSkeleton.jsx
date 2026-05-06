import React from "react";

/**
 * CustomerProductsSkeleton
 * Mirrors the actual product layout:
 *  – Desktop: table rows with image, text columns, badge, button
 *  – Mobile:  cards with image block, text lines, badge + button
 */
const Shimmer = ({ className }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const DesktopRow = () => (
  <tr className="border-t border-gray-100">
    {/* S/N */}
    <td className="p-4">
      <Shimmer className="h-4 w-6" />
    </td>
    {/* Image */}
    <td className="p-4">
      <Shimmer className="w-16 h-16 rounded-lg" />
    </td>
    {/* Product name */}
    <td className="p-4">
      <Shimmer className="h-4 w-32 mb-1.5" />
      <Shimmer className="h-3 w-20" />
    </td>
    {/* Category */}
    <td className="p-4">
      <Shimmer className="h-4 w-24" />
    </td>
    {/* Price */}
    <td className="p-4">
      <Shimmer className="h-4 w-20" />
    </td>
    {/* Stock badge */}
    <td className="p-4 text-center">
      <Shimmer className="h-6 w-10 rounded-full mx-auto" />
    </td>
    {/* Description */}
    <td className="p-4">
      <Shimmer className="h-3 w-full mb-1" />
      <Shimmer className="h-3 w-3/4" />
    </td>
    {/* Action button */}
    <td className="p-4 text-center">
      <Shimmer className="h-8 w-20 rounded-md mx-auto" />
    </td>
  </tr>
);

const MobileCard = () => (
  <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm space-y-3">
    <div className="flex gap-4">
      {/* Image */}
      <Shimmer className="w-20 h-20 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Shimmer className="h-5 w-3/4" />
        <Shimmer className="h-3.5 w-1/2" />
        <Shimmer className="h-5 w-24" />
      </div>
    </div>
    {/* Description lines */}
    <div className="space-y-1.5">
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-3 w-5/6" />
    </div>
    {/* Footer row */}
    <div className="flex items-center justify-between pt-1">
      <Shimmer className="h-6 w-20 rounded-full" />
      <Shimmer className="h-9 w-28 rounded-lg" />
    </div>
  </div>
);

const CustomerProductsSkeleton = ({ rows = 6 }) => {
  return (
    <>
      {/* ── Desktop table skeleton ────────────────────────────────── */}
      <div className="hidden md:block bg-white shadow-lg rounded-xl border border-gray-100 overflow-hidden">
        {/* Fake table header */}
        <div className="bg-gray-100 px-4 py-3 grid grid-cols-8 gap-4">
          {["w-6", "w-12", "w-24", "w-20", "w-16", "w-10", "w-full", "w-16"].map(
            (w, i) => (
              <Shimmer key={i} className={`h-3.5 ${w}`} />
            )
          )}
        </div>
        <table className="min-w-full">
          <tbody>
            {[...Array(rows)].map((_, i) => (
              <DesktopRow key={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card skeleton ──────────────────────────────────── */}
      <div className="md:hidden space-y-4">
        {[...Array(Math.min(rows, 4))].map((_, i) => (
          <MobileCard key={i} />
        ))}
      </div>
    </>
  );
};

export default CustomerProductsSkeleton;