import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Pencil, Trash2, Plus, Trash,
  Phone, Mail, Package, AlertTriangle,
  Copy, Check, Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const PAGE_SIZE = 20;
const WHOLESALE_COL_PREF_KEY = "melech_show_wholesale_col";

// ── Copy button ──────────────────────────────────────────────────────────────
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} title={copied ? "Copied!" : `Copy ${text}`}
      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition flex-shrink-0">
      {copied ? <Check size={9} className="text-green-500" /> : <Copy size={9} />}
    </button>
  );
};

// ── Stock badge ───────────────────────────────────────────────────────────────
const StockBadge = ({ stock }) => {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Out of stock
      </span>
    );
  if (stock < 5)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Low — {stock} left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-100">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> {stock} in stock
    </span>
  );
};

// ── Reorder hint ──────────────────────────────────────────────────────────────
const ReorderHint = ({ supplier }) => {
  if (!supplier) return null;
  return (
    <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-100 flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Reorder from</span>
      <span className="text-[11px] font-medium text-gray-700">{supplier.name}</span>
      {supplier.phone && (
        <div className="flex items-center gap-1.5">
          <a href={`tel:${supplier.phone}`}
            className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:underline">
            <Phone size={9} />{supplier.phone}
          </a>
          <CopyButton text={supplier.phone} />
        </div>
      )}
      {supplier.email && (
        <div className="flex items-center gap-1.5">
          <a href={`mailto:${supplier.email}`}
            className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline">
            <Mail size={9} />{supplier.email}
          </a>
          <CopyButton text={supplier.email} />
        </div>
      )}
    </div>
  );
};

// ── Skeletons ─────────────────────────────────────────────────────────────────
const UpdatingRowSkeleton = () => (
  <tr className="border-b border-gray-50 bg-blue-50/40">
    <td colSpan={8} className="px-4 py-3.5">
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
      <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-100 rounded" /></td>
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

// ── Main component ────────────────────────────────────────────────────────────
const ProductTable = ({
  products,
  onEdit,
  onDelete,
  onAddClick,
  onViewDeleted,
  updatingProductId,
  scrollRef,
}) => {
  const { user } = useAuth();
  const role = (user?.role || "").toString().toLowerCase();
  const isAdmin = role === "admin";
  const isStaff = role === "staff";

  // ── Wholesale column toggle (staff only) ─────────────────────────────────
  // Preference is saved to localStorage so it persists across sessions
  const [showWholesaleCol, setShowWholesaleCol] = useState(() => {
    if (!isStaff) return false; // only staff sees the toggle at all
    try {
      const saved = localStorage.getItem(WHOLESALE_COL_PREF_KEY);
      return saved !== null ? JSON.parse(saved) : true; // default ON for staff
    } catch { return true; }
  });

  const toggleWholesaleCol = () => {
    setShowWholesaleCol((prev) => {
      const next = !prev;
      try { localStorage.setItem(WHOLESALE_COL_PREF_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading,    setIsLoading]    = useState(false);
  const sentinelRef  = useRef(null);
  const tableWrapRef = useRef(null);
  const mobileWrapRef= useRef(null);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore         = visibleCount < products.length;
  const outOfStock      = products.filter((p) => p.stock === 0).length;
  const lowStock        = products.filter((p) => p.stock > 0 && p.stock < 5).length;
  const totalValue      = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

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
    const wrap     = tableWrapRef.current;
    if (!sentinel || !wrap) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: wrap, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Reset visible count whenever the product list changes — catches both
  // filtering down (fewer results) and switching back to "All Categories"
  // (more results). Without this, the infinite-scroll window stays at the
  // previous count and shows fewer items than exist.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [products]);

  // Determine desktop table columns
  // Admin always sees both prices; staff sees retail + optional wholesale column
  const showWholesale = isAdmin || (isStaff && showWholesaleCol);

  const desktopHeaders = [
    "#", "Product", "Category", "RT (₦)",
    ...(showWholesale ? ["WP (₦)"] : []),
    "Stock", "Description", "Actions",
  ];

  return (
    <div className="w-full flex flex-col gap-4">

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total products",   value: products.length,             icon: <Package size={16} className="text-blue-500" />,   bg: "bg-blue-50",   text: "text-blue-700" },
          { label: "Inventory value",  value: `₦${totalValue.toLocaleString()}`, icon: <span className="text-green-500 font-bold text-sm">₦</span>, bg: "bg-green-50", text: "text-green-700" },
          { label: "Low stock",        value: lowStock,                    icon: <AlertTriangle size={15} className="text-amber-500" />, bg: "bg-amber-50", text: "text-amber-700" },
          { label: "Out of stock",     value: outOfStock,                  icon: <AlertTriangle size={15} className="text-red-500" />,  bg: "bg-red-50",   text: "text-red-700" },
        ].map(({ label, value, icon, bg, text }) => (
          <div key={label} className={`${bg} rounded-xl p-3 flex items-center gap-3 border border-white shadow-sm`}>
            <div className="flex-shrink-0">{icon}</div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</p>
              <p className={`text-base font-bold ${text}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CARD ── */}
      <div className="w-full bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Product list</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Showing {visibleProducts.length} of {products.length}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* ✅ Wholesale column toggle — staff only */}
            {isStaff && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Wholesale column</span>
                <button
                  onClick={toggleWholesaleCol}
                  role="switch"
                  aria-checked={showWholesaleCol}
                  title={showWholesaleCol ? "Hide wholesale price column" : "Show wholesale price column"}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${showWholesaleCol ? 'bg-amber-400' : 'bg-gray-200'}`}
                >
                  <span
                    className={`transform transition-transform inline-block h-5 w-5 rounded-full bg-white shadow ${showWholesaleCol ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            )}
            <button onClick={onViewDeleted}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              <Trash size={13} />
              <span className="hidden sm:inline">View deleted</span>
            </button>
            <button onClick={onAddClick}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition">
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
            if (scrollRef) scrollRef.current = el;
          }}
          className="hidden md:block overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 340px)" }}
        >
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                {desktopHeaders.map((h, i) => (
                  <th key={i}
                    className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide bg-gray-50 border-b border-gray-100 text-gray-500 whitespace-nowrap">
                    {h === "WP (₦)" ? (
                      <span className={`flex items-center gap-1 ${isAdmin ? 'text-amber-700 font-semibold' : ''}`}>
                        {h}
                      </span>
                    ) : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleProducts.length > 0 ? (
                <>
                  {visibleProducts.map((product, index) =>
                    updatingProductId === product._id ? (
                      <UpdatingRowSkeleton key={product._id} />
                    ) : (
                      <tr key={product._id}
                        className="group hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-none align-top">
                        {/* # */}
                        <td className="px-4 py-3.5 text-gray-400 text-xs w-8">{index + 1}</td>

                        {/* Product */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0 shadow-sm">
                              {product.image
                                ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                                : <Package size={14} className="text-gray-300" />}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm leading-tight">{product.name}</p>
                              {product.supplierId && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{product.supplierId.name}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                            {product.categoryId?.name || "N/A"}
                          </span>
                        </td>

                        {/* Retail price */}
                        <td className="px-4 py-3.5 font-bold text-gray-800 whitespace-nowrap">
                          ₦{Number(product.price).toLocaleString()}
                        </td>

                        {/* Wholesale price — only shown when toggle is on */}
                        {showWholesale && (
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {product.wholesalePrice
                              ? <span className="font-semibold text-amber-700">₦{Number(product.wholesalePrice).toLocaleString()}</span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        )}

                        {/* Stock + reorder */}
                        <td className="px-4 py-3.5 min-w-[160px]">
                          <StockBadge stock={product.stock} />
                          {product.stock < 5 && product.supplierId && (
                            <ReorderHint supplier={product.supplierId} />
                          )}
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[200px]">
                          <p className="line-clamp-2 leading-relaxed">{product.description || "—"}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => onEdit(product)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-100 transition"
                              title="Edit product"><Pencil size={14} /></button>
                            <button onClick={() => onDelete(product._id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-100 transition"
                              title="Delete product"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                  {isLoading && <SkeletonRows />}
                </>
              ) : (
                <tr>
                  <td colSpan={desktopHeaders.length} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={36} strokeWidth={1.2} className="text-gray-200" />
                      <p className="text-sm text-gray-400 font-medium">No products found</p>
                      <p className="text-xs text-gray-300">Add your first product using the button above</p>
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
          ref={(el) => { mobileWrapRef.current = el; if (scrollRef) scrollRef.current = el; }}
          className="md:hidden overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 340px)" }}
        >
          {visibleProducts.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {visibleProducts.map((product) =>
                updatingProductId === product._id ? (
                  <div key={product._id} className="p-4 bg-blue-50/40 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-blue-100 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-blue-100 rounded w-3/4" />
                        <div className="h-3 bg-blue-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={product._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0 shadow-sm">
                        {product.image
                          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                          : <Package size={20} className="text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{product.name}</p>
                            {product.supplierId && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{product.supplierId.name}</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => onEdit(product)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-100 transition">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => onDelete(product._id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-100 transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="font-bold text-gray-800 text-sm">
                            ₦{Number(product.price).toLocaleString()}
                          </span>
                          {showWholesale && product.wholesalePrice && (
                            <span className="font-semibold text-amber-700 text-xs">
                              WS: ₦{Number(product.wholesalePrice).toLocaleString()}
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {product.categoryId?.name || "N/A"}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <StockBadge stock={product.stock} />
                        </div>
                      </div>
                    </div>
                    {product.description && (
                      <p className="mt-2 text-xs text-gray-400 line-clamp-2 leading-relaxed">{product.description}</p>
                    )}
                    {product.stock < 5 && product.supplierId && (
                      <div className="mt-2"><ReorderHint supplier={product.supplierId} /></div>
                    )}
                  </div>
                )
              )}

              {isLoading && (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div ref={sentinelRef} style={{ height: 1 }} />
              {!hasMore && products.length > 0 && (
                <p className="text-center text-xs text-gray-300 py-4 border-t border-gray-50">
                  All {products.length} products loaded
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Package size={40} strokeWidth={1.2} className="text-gray-200" />
              <p className="text-sm text-gray-400 font-medium">No products found</p>
              <p className="text-xs text-gray-300">Tap Add to create your first product</p>
              <button onClick={onAddClick}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition">
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
