import React, { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

const PAGE_SIZE = 15;

const pgBtn = (disabled, active = false) => ({
  padding: "4px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
  border: active ? "none" : "1px solid #e2e8f0",
  background: active ? "#4f46e5" : disabled ? "#f8fafc" : "#fff",
  color: active ? "#fff" : disabled ? "#cbd5e1" : "#374151",
  transition: "all .15s",
});

const CategoryTable = ({ categories, onEdit, onDelete }) => {
  const safeCategories = categories || [];
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(safeCategories.length / PAGE_SIZE);
  const paginated  = safeCategories.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const Pagination = () => totalPages > 1 ? (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"12px 0", flexWrap:"wrap" }}>
      <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={pgBtn(currentPage === 1)}>← Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
        .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx-1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
        .map((p, idx) => p === "…"
          ? <span key={`e${idx}`} style={{ color:"#94a3b8", fontSize:13 }}>…</span>
          : <button key={p} onClick={() => setCurrentPage(p)} style={pgBtn(false, p === currentPage)}>{p}</button>
        )}
      <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={pgBtn(currentPage === totalPages)}>Next →</button>
    </div>
  ) : null;

  return (
    <div className="w-full lg:w-2/3">
      {/* Desktop Table */}
      <div className="hidden md:block bg-white shadow-lg rounded-xl p-4 border border-gray-100">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-left">
              <th className="p-3 text-sm font-semibold">S/N</th>
              <th className="p-3 text-sm font-semibold">Category Name</th>
              <th className="p-3 text-sm font-semibold">Description</th>
              <th className="p-3 text-sm font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-500 py-6">No categories found.</td></tr>
            ) : (
              paginated.map((category, index) => (
                <tr key={category._id} className="border-t border-gray-200 hover:bg-gray-50 transition-all">
                  <td className="p-3 text-sm">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="p-3 font-medium text-gray-800">{category.name}</td>
                  <td className="p-3 text-gray-600">{category.description}</td>
                  <td className="p-3 flex justify-center gap-3">
                    <button onClick={() => onEdit(category)} className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all"><Pencil size={18} /></button>
                    <button onClick={() => onDelete(category._id)} className="text-red-600 hover:text-red-800 hover:scale-110 transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>{/* end scroll wrapper */}
        <Pagination />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="space-y-4">
        {paginated.length === 0 ? (
          <div className="text-center text-gray-500 py-6">No categories found.</div>
        ) : (
          paginated.map((category, index) => (
            <div key={category._id} className="bg-white shadow-lg rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">{category.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                </div>
                <span className="text-sm text-gray-400">#{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(category)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all">
                  <Pencil size={16} /> Edit
                </button>
                <button onClick={() => onDelete(category._id)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all">
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
        </div>{/* end scroll wrapper */}
        <Pagination />
      </div>
    </div>
  );
};

export default CategoryTable;
