import React from "react";

const CustomerOrdersSkeleton = () => {
  const rows = Array(5).fill(null);

  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 w-1/3 bg-gray-300 rounded"></div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-200">
              {Array(8)
                .fill(null)
                .map((_, i) => (
                  <th key={i} className="p-3">
                    <div className="h-4 bg-gray-300 rounded"></div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((_, i) => (
              <tr key={i}>
                {Array(8)
                  .fill(null)
                  .map((_, j) => (
                    <td key={j} className="p-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerOrdersSkeleton;
