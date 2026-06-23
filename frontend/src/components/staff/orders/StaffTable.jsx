import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaPlus, FaMinus, FaTrash, FaImage } from "react-icons/fa";
import { Search, X } from "lucide-react";

const StaffTable = ({ orders, onIncreaseQty, onReduceQty, onRemoveOrder, isWholesale }) => {
  const [search, setSearch] = useState("");

  const visible = search.trim()
    ? orders.filter((o) =>
        (o.product?.name || "").toLowerCase().includes(search.trim().toLowerCase())
      )
    : orders;

  if (!orders.length) return null;

  return (
    <div className="space-y-3">

      {/* ── Search bar ── */}
      {orders.length > 1 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${orders.length} items…`}
            className="w-full pl-8 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white
              focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* No match */}
      {visible.length === 0 && search && (
        <div className="py-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-sm">No items match "<span className="text-gray-600">{search}</span>"</p>
          <button onClick={() => setSearch("")} className="mt-1.5 text-xs text-indigo-500 hover:underline">Clear</button>
        </div>
      )}
      {/* ── Desktop table ─────────────────────────────────────────────────── */}
      {visible.length > 0 && (
      <div className="hidden lg:block rounded-xl overflow-hidden border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
              <th className="px-4 py-3 text-left w-8">#</th>
              <th className="px-4 py-3 text-left w-16">Image</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-center w-32">Qty</th>
              <th className="px-4 py-3 text-right w-28">Unit Price</th>
              <th className="px-4 py-3 text-right w-28">Subtotal</th>
              <th className="px-4 py-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map((o, i) => (
              <motion.tr
                key={o._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white hover:bg-indigo-50/40 transition-colors"
              >
                {/* # */}
                <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>

                {/* Image */}
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                    {o.product?.image ? (
                      <img src={o.product.image} alt={o.product?.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-200" />
                    ) : (
                      <FaImage size={16} className="text-gray-300" />
                    )}
                  </div>
                </td>

                {/* Product details */}
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{o.product?.name || "Unknown Product"}</p>
                  {o.product?.categoryId?.name && (
                    <p className="text-xs text-indigo-500 font-medium mt-0.5">{o.product.categoryId.name}</p>
                  )}
                  {o.product?.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{o.product.description}</p>
                  )}
                  {isWholesale && (
                    <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
                      WSP
                    </span>
                  )}
                </td>

                {/* Qty controls */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <motion.button
                      onClick={() => onReduceQty(o._id)}
                      whileTap={{ scale: 0.9 }}
                      className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-yellow-100 hover:text-yellow-700 text-gray-600 rounded-lg transition"
                    >
                      <FaMinus size={10} />
                    </motion.button>
                    <span className="w-8 text-center font-bold text-gray-800 text-sm">{o.quantity}</span>
                    <motion.button
                      onClick={() => onIncreaseQty(o._id)}
                      whileTap={{ scale: 0.9 }}
                      className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-green-100 hover:text-green-700 text-gray-600 rounded-lg transition"
                    >
                      <FaPlus size={10} />
                    </motion.button>
                  </div>
                </td>

                {/* Unit price */}
                <td className="px-4 py-3 text-right text-gray-600 font-medium">
                  ₦{o.price?.toLocaleString()}
                </td>

                {/* Subtotal */}
                <td className="px-4 py-3 text-right font-bold text-indigo-600">
                  ₦{(o.totalPrice || o.quantity * o.price)?.toLocaleString()}
                </td>

                {/* Remove */}
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <motion.button
                      onClick={() => onRemoveOrder(o._id)}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-lg transition"
                      title="Remove item"
                    >
                      <FaTrash size={12} />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* ── Mobile cards ──────────────────────────────────────────────────── */}
      {visible.length > 0 && (
      <div className="lg:hidden space-y-3">
        {visible.map((o, i) => (
          <motion.div
            key={o._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            {/* Card top */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-50">
              {/* Image */}
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                {o.product?.image ? (
                  <img src={o.product.image} alt={o.product?.name} className="w-full h-full object-cover" />
                ) : (
                  <FaImage size={20} className="text-gray-300" />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{o.product?.name || "Unknown Product"}</p>
                {o.product?.categoryId?.name && (
                  <p className="text-xs text-indigo-500 font-medium">{o.product.categoryId.name}</p>
                )}
                {isWholesale && (
                  <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
                    WSP
                  </span>
                )}
              </div>
              {/* Remove */}
              <motion.button
                onClick={() => onRemoveOrder(o._id)}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-xl transition shrink-0"
              >
                <FaTrash size={12} />
              </motion.button>
            </div>

            {/* Price + qty — responsive layout */}
            <div className="px-4 py-3 space-y-2.5">
              {/* Prices row */}
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Unit price</p>
                  <p className="font-semibold text-gray-700 text-sm truncate">
                    ₦{o.price?.toLocaleString()}
                  </p>
                </div>
                <div className="text-right min-w-0 ml-2">
                  <p className="text-xs text-gray-400 mb-0.5">Subtotal</p>
                  <p className="font-bold text-indigo-600 text-sm truncate">
                    ₦{(o.totalPrice || o.quantity * o.price)?.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Qty controls — full width, centered */}
              <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-xl py-2">
                <motion.button
                  onClick={() => onReduceQty(o._id)}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 hover:bg-yellow-50 hover:border-yellow-300 text-gray-600 rounded-xl transition shadow-sm"
                >
                  <FaMinus size={11} />
                </motion.button>
                <span className="w-10 text-center font-bold text-gray-800 text-base select-none">
                  {o.quantity}
                </span>
                <motion.button
                  onClick={() => onIncreaseQty(o._id)}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 hover:bg-green-50 hover:border-green-300 text-gray-600 rounded-xl transition shadow-sm"
                >
                  <FaPlus size={11} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
};

export default StaffTable;
