import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Pencil, Trash2, Plus, Trash,
  Phone, Mail, Package, AlertTriangle,
  Copy, Check,
} from "lucide-react";

const PAGE_SIZE = 20;

// ✅ Copy button — copies text to clipboard
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${text}`}
      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition flex-shrink-0"
    >
      {copied
        ? <Check size={9} className="text-green-500" />
        : <Copy size={9} />}
    </button>
  );
};

const StockBadge = ({ stock }) => {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
        Out of stock
      </span>
    );
  if (stock < 5)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        Low — {stock} left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-100">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      {stock} in stock
    </span>
  );
};

// ✅ Reorder hint with copy buttons — fixed anchor tags
const ReorderHint = ({ supplier }) => {
  if (!supplier) return null;
  return (
    <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-100 flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
        Reorder from
      </span>
      <span className="text-[11px] font-medium text-gray-700">{supplier.name}</span>

      {supplier.phone && (
        <div className="flex items-center gap-1.5">
          
          <a  href={`tel:${supplier.phone}`}
            className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-800 hover:underline"
          >
            <Phone size={9} />
            {supplier.phone}
          </a>
          <CopyButton text={supplier.phone} />
        </div>
      )}

      {supplier.email && (
        <div className="flex items-center gap-1.5">
          
          <a  href={`https://mail.google.com/mail/?view=cm&to=${supplier.email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 hover:underline"
          >
            <Mail size={9} />
            {supplier.email}
          </a>
          <CopyButton text={supplier.email} />
        </div>
      )}
    </div>
  );
};

// ✅ Skeleton for the single row being updated
const UpdatingRowSkeleton = () => (
  <tr className="border-b border-gray-50 bg-blue-50/40">
    <td colSpan={7} className="px-4 py-3.5">
      <div className="flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-blue-100 rounded w-40" />
          <div className="h-2 bg-blue-100 rounded w-24" />
        </div>
        <div className="h-5 w-24 bg-blue-100 rounded-full" />
        <div className="h-5 w-20 bg-blue-100 rounded-full" />
        <div className="h-3 w-16 bg-blue-100 rounded" />
      </div>
    </td>
  </tr>
);

// ✅ Skeleton for mobile card being updated
const UpdatingCardSkeleton = () => (
  <div className="p-4 bg-blue-50/40 animate-pulse">
    <div className="flex gap-3">
      <div className="w-16 h-16 rounded-xl bg-blue-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-blue-100 rounded w-3/4" />
        <div className="h-3 bg-blue-100 rounded w-1/2" />
        <div className="h-5 bg-blue-100 rounded-full w-24" />
      </div>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="animate-pulse bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
    <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-5 bg-gray-100 rounded-full w-24" />
    </div>
  </div>
);

const SkeletonRows = () =>
  [...Array(3)].map((_, i) => (
    <tr key={i} className="animate-pulse border-b border-gray-50">
      <td className="px-4 py-3"><div className="h-3 w-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-28" />
            <div className="h-2 bg-gray-100 rounded w-16" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-5 w-20 bg-gray-100 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-24 bg-gray-100 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-32" /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        </div>
      </td>
    </tr>
  ));

const ProductTable = ({
  products,
  onEdit,
  onDelete,
  onAddClick,
  onViewDeleted,
  updatingProductId, // ✅ which product row shows skeleton
  scrollRef, // ✅ NEW PROP
}) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef(null);
  const tableWrapRef = useRef(null);
  const mobileWrapRef = useRef(null);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock < 5).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, products.length));
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore, products.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const wrap = tableWrapRef.current;
    if (!sentinel || !wrap) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: wrap, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
  if (products.length < visibleCount) {
    setVisibleCount(products.length || PAGE_SIZE);
  }
}, [products.length]);

  return (
    <div className="w-full flex flex-col gap-4">

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total products",
            value: products.length,
            icon: <Package size={16} className="text-blue-500" />,
            bg: "bg-blue-50",
            text: "text-blue-700",
          },
          {
            label: "Inventory value",
            value: `₦${totalValue.toLocaleString()}`,
            icon: <span className="text-green-500 font-bold text-sm">₦</span>,
            bg: "bg-green-50",
            text: "text-green-700",
          },
          {
            label: "Low stock",
            value: lowStock,
            icon: <AlertTriangle size={15} className="text-amber-500" />,
            bg: "bg-amber-50",
            text: "text-amber-700",
          },
          {
            label: "Out of stock",
            value: outOfStock,
            icon: <AlertTriangle size={15} className="text-red-500" />,
            bg: "bg-red-50",
            text: "text-red-700",
          },
        ].map(({ label, value, icon, bg, text }) => (
          <div
            key={label}
            className={`${bg} rounded-xl p-3 flex items-center gap-3 border border-white shadow-sm`}
          >
            <div className="flex-shrink-0">{icon}</div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
                {label}
              </p>
              <p className={`text-base font-bold ${text}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CARD ── */}
      <div className="w-full bg-slate-950 shadow-2xl rounded-xl overflow-hidden border border-slate-800">

        {/* TOOLBAR */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Product list</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Showing {visibleProducts.length} of {products.length}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onViewDeleted}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 transition"
            >
              <Trash size={13} />
              <span className="hidden sm:inline">View deleted</span>
            </button>
            <button
              onClick={onAddClick}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Add product</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* ── DESKTOP TABLE ── */}
        <div
  ref={(el) => {
    tableWrapRef.current = el;
    if (scrollRef) scrollRef.current = el; // ✅ share ref with parent
  }}
  className="hidden md:block overflow-y-auto"
  style={{ maxHeight: "calc(100vh - 340px)" }}
>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                {["#", "Product", "Category", "Price", "Stock", "Description", "Actions"].map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide bg-slate-900 border-b border-slate-800 text-slate-400 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleProducts.length > 0 ? (
                <>
                  {visibleProducts.map((product, index) =>
                    // ✅ Show skeleton row for the product being updated
                    updatingProductId === product._id ? (
                      <UpdatingRowSkeleton key={product._id} />
                    ) : (
                      <tr
                        key={product._id}
                        className="group hover:bg-slate-900/70 transition-colors border-b border-slate-800 last:border-none align-top"
                      >
                        {/* # */}
                        <td className="px-4 py-3.5 text-slate-400 text-xs w-8">
                          {index + 1}
                        </td>

                        {/* Product — image + name */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl border border-slate-800 overflow-hidden bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Package size={14} className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100 text-sm leading-tight">
                                {product.name}
                              </p>
                              {product.supplierId && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {product.supplierId.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-100 border border-slate-700 whitespace-nowrap">
                            {product.categoryId?.name || "N/A"}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3.5 font-bold text-slate-100 whitespace-nowrap">
                          ₦{Number(product.price).toLocaleString()}
                        </td>

                        {/* Stock + reorder */}
                        <td className="px-4 py-3.5 min-w-[160px]">
                          <StockBadge stock={product.stock} />
                          {product.stock < 5 && product.supplierId && (
                            <ReorderHint supplier={product.supplierId} />
                          )}
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3.5 text-slate-400 text-xs max-w-[200px]">
                          <p className="line-clamp-2 leading-relaxed">
                            {product.description || "—"}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onEdit(product)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition"
                              title="Edit product"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => onDelete(product._id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition"
                              title="Delete product"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                  {isLoading && <SkeletonRows />}
                </>
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={36} strokeWidth={1.2} className="text-gray-200" />
                      <p className="text-sm text-gray-400 font-medium">No products found</p>
                      <p className="text-xs text-gray-300">
                        Add your first product using the button above
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div ref={sentinelRef} style={{ height: 1 }} />

          {!hasMore && products.length > 0 && (
            <p className="text-center text-xs text-gray-300 py-4 border-t border-gray-50">
              All {products.length} products loaded
            </p>
          )}
        </div>

        {/* ── MOBILE CARDS ── */}
        <div
  ref={(el) => {
    mobileWrapRef.current = el;
    if (scrollRef) scrollRef.current = el; // ✅ share ref with parent
  }}
  className="md:hidden overflow-y-auto"
  style={{ maxHeight: "calc(100vh - 340px)" }}
>
          {visibleProducts.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {visibleProducts.map((product) =>
                // ✅ Show skeleton card for the product being updated on mobile
                updatingProductId === product._id ? (
                  <UpdatingCardSkeleton key={product._id} />
                ) : (
                  <div
                    key={product._id}
                    className="p-4 bg-slate-900 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl border border-slate-800 overflow-hidden bg-slate-950 flex items-center justify-center flex-shrink-0 shadow-sm">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package size={20} className="text-slate-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-100 text-sm leading-tight truncate">
                              {product.name}
                            </p>
                            {product.supplierId && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {product.supplierId.name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => onEdit(product)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => onDelete(product._id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="font-bold text-slate-100 text-sm">
                            ₦{Number(product.price).toLocaleString()}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-100 border border-slate-700">
                            {product.categoryId?.name || "N/A"}
                          </span>
                        </div>

                        <div className="mt-1.5">
                          <StockBadge stock={product.stock} />
                        </div>
                      </div>
                    </div>

                    {product.description && (
                      <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    {product.stock < 5 && product.supplierId && (
                      <div className="mt-2">
                        <ReorderHint supplier={product.supplierId} />
                      </div>
                    )}
                  </div>
                )
              )}

              {isLoading && (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )}

              <div ref={sentinelRef} style={{ height: 1 }} />

              {!hasMore && products.length > 0 && (
                <p className="text-center text-xs text-slate-400 py-4 border-t border-slate-800">
                  All {products.length} products loaded
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center text-slate-300">
              <Package size={40} strokeWidth={1.2} className="text-slate-400" />
              <p className="text-sm text-slate-300 font-medium">No products found</p>
              <p className="text-xs text-slate-400">Tap Add to create your first product</p>
              <button
                onClick={onAddClick}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Plus size={13} /> Add product
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductTable;