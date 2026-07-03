import React, { useState, useRef, useEffect } from "react";
import {
  Pencil, Trash2, Plus, Trash,
  Phone, Mail, Package, AlertTriangle,
  Copy, Check, ScanLine, CalendarClock,
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
const StockBadge = ({ stock, threshold = 10 }) => {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Out of stock
      </span>
    );
  if (stock <= threshold)
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

// ── Expiry badge ──────────────────────────────────────────────────────────────
const ExpiryBadge = ({ expiryDate, highlight = false }) => {
  if (!expiryDate) return <span className="text-gray-300 text-xs">—</span>;

  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const exp      = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  const label    = exp.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  if (diffDays < 0)
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100 ${highlight ? "ring-1 ring-red-300" : ""}`}>
        <CalendarClock size={10} /> Expired · {label}
      </span>
    );
  if (diffDays <= 7)
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100 ${highlight ? "ring-1 ring-red-300" : ""}`}>
        <CalendarClock size={10} /> {diffDays}d left · {label}
      </span>
    );
  if (diffDays <= 30)
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-100 ${highlight ? "ring-1 ring-orange-300" : ""}`}>
        <CalendarClock size={10} /> {diffDays}d left · {label}
      </span>
    );
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-500 border border-gray-100 ${highlight ? "ring-1 ring-purple-200" : ""}`}>
      <CalendarClock size={10} /> {label}
    </span>
  );
};

// ── Batch number badge ────────────────────────────────────────────────────────
const BatchBadge = ({ batchNumber, highlight = false }) => {
  if (!batchNumber) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-100 ${highlight ? "ring-1 ring-purple-400 bg-purple-100" : ""}`}>
      <ScanLine size={10} /> {batchNumber}
    </span>
  );
};


// ── Pagination bar ────────────────────────────────────────────────────────────
const PaginationBar = ({
  currentPage, totalPages, totalItems, pageSize,
  startIdx, jumpInput, setJumpInput, goToPage, handleJumpSubmit,
}) => {
  const pages = [];
  const addPage = (n) => { if (!pages.includes(n) && n >= 1 && n <= totalPages) pages.push(n); };
  addPage(1);
  addPage(currentPage - 1);
  addPage(currentPage);
  addPage(currentPage + 1);
  addPage(totalPages);
  pages.sort((a, b) => a - b);

  const withGaps = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) withGaps.push("...");
    withGaps.push(pages[i]);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex-wrap">
      <p className="text-[11px] text-gray-400 order-2 sm:order-1">
        Showing <span className="font-semibold text-gray-600">{startIdx + 1}</span>–<span className="font-semibold text-gray-600">{Math.min(startIdx + pageSize, totalItems)}</span> of <span className="font-semibold text-gray-600">{totalItems}</span> &nbsp;·&nbsp; Page <span className="font-semibold text-gray-600">{currentPage}</span> of <span className="font-semibold text-gray-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-white hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
          aria-label="Previous page">&#8592;</button>
        {withGaps.map((item, i) =>
          item === "..." ? (
            <span key={`gap-${i}`} className="w-8 text-center text-xs text-gray-400">…</span>
          ) : (
            <button key={item} onClick={() => goToPage(item)} aria-current={item === currentPage ? "page" : undefined}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition
                ${item === currentPage ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "border-gray-200 text-gray-600 hover:bg-white hover:border-blue-300 hover:text-blue-600"}`}
            >{item}</button>
          )
        )}
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-white hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
          aria-label="Next page">&#8594;</button>
      </div>
      <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 order-3">
        <span className="text-[11px] text-gray-400">Go to</span>
        <input type="number" min={1} max={totalPages} value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          placeholder="pg"
          className="w-14 h-8 text-center text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
        />
        <button type="submit"
          className="h-8 px-2.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition">
          Go
        </button>
      </form>
    </div>
  );
};


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

// ── Main component ────────────────────────────────────────────────────────────
const ProductTable = ({
  products,
  onEdit,
  onDelete,
  onAddClick,
  onViewDeleted,
  updatingProductId,
  scrollRef,
  lowStockThreshold = 10,
  onToggleNewArrival,
  onToggleBonanza,
  onToggleStaffOnly,
  batchSearch = "",
  expiryDateFilter = "",
  // ── Bulk selection props ──────────────────────────────────────────────────
  selectedIds = [],
  onSelectId,        // (id, checked) => void
  onSelectPage,      // (ids, checked) => void  — select/deselect all on current page
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

  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput,   setJumpInput]   = useState("");
  const tableWrapRef  = useRef(null);
  const mobileWrapRef = useRef(null);

  const totalPages    = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage      = Math.min(currentPage, totalPages);
  const startIdx      = (safePage - 1) * PAGE_SIZE;
  const visibleProducts = products.slice(startIdx, startIdx + PAGE_SIZE);

  // Reset to page 1 whenever the product list changes (filter / re-fetch)
  useEffect(() => {
    setCurrentPage(1);
    setJumpInput("");
  }, [products]);

  // Scroll the table wrapper back to top on page change
  useEffect(() => {
    if (tableWrapRef.current)  tableWrapRef.current.scrollTop  = 0;
    if (mobileWrapRef.current) mobileWrapRef.current.scrollTop = 0;
  }, [currentPage]);

  const goToPage = (p) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setCurrentPage(clamped);
    setJumpInput("");
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const n = parseInt(jumpInput, 10);
    if (!isNaN(n)) goToPage(n);
  };
  const lowStock    = products.filter((p) => {
    const t = p.individualLowStockThreshold ?? lowStockThreshold;
    return p.stock > 0 && p.stock <= t;
  }).length;
  const outOfStock  = products.filter((p) => p.stock === 0).length;
  const totalValue  = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  // Expiry stats — calculated from full product list (not filtered)
  const today        = new Date(); today.setHours(0, 0, 0, 0);
  const expiringSoon = products.filter((p) => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate); exp.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).length;

  // Determine desktop table columns
  // Admin always sees both prices; staff sees retail + optional wholesale column
  // Batch + Expiry columns always shown (they show "—" when not set)
  const showWholesale = isAdmin || (isStaff && showWholesaleCol);

  // ── Selection helpers ────────────────────────────────────────────────────
  const pageIds         = visibleProducts.map((p) => p._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id)) && !allPageSelected;

  const desktopHeaders = [
    ...(isAdmin ? ["☑"] : []),
    "#", "Product", "Category", "RT (₦)",
    ...(showWholesale ? ["WP (₦)"] : []),
    "Stock",
    "Batch No.",
    "Expiry",
    "Description",
    "Actions",
  ];

  return (
    <div className="w-full flex flex-col gap-4">

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total products",   value: products.length,                  icon: <Package size={16} className="text-blue-500" />,           bg: "bg-blue-50",   text: "text-blue-700" },
          { label: "Inventory value",  value: `₦${totalValue.toLocaleString()}`, icon: <span className="text-green-500 font-bold text-sm">₦</span>, bg: "bg-green-50",  text: "text-green-700" },
          { label: "Low stock",        value: lowStock,                          icon: <AlertTriangle size={15} className="text-amber-500" />,     bg: "bg-amber-50",  text: "text-amber-700" },
          { label: "Out of stock",     value: outOfStock,                        icon: <AlertTriangle size={15} className="text-red-500" />,       bg: "bg-red-50",    text: "text-red-700" },
          { label: "Expiring ≤30d",    value: expiringSoon,                      icon: <CalendarClock size={15} className="text-orange-500" />,    bg: "bg-orange-50", text: "text-orange-700" },
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
              {products.length === 0
                ? "No products"
                : `${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, products.length)} of ${products.length} products`
              }
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* ✅ Wholesale column toggle — staff only */}
            {isStaff && (
              <div className="flex items-center gap-2">
                {/* Label hidden on small screens to save space — toggle is still visible */}
                <span className="hidden sm:inline text-xs text-gray-500">Wholesale col</span>
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
          className="hidden md:block overflow-x-auto"
        >
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                {desktopHeaders.map((h, i) => (
                  h === "☑" ? (
                    <th key="sel" className="px-3 py-3 bg-gray-50 border-b border-gray-100 w-8">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                        onChange={(e) => onSelectPage?.(pageIds, e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                        title="Select / deselect all on this page"
                      />
                    </th>
                  ) : (
                    <th key={i}
                      className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide bg-gray-50 border-b border-gray-100 text-gray-500 whitespace-nowrap">
                      {h === "WP (₦)" ? (
                        <span className={`flex items-center gap-1 ${isAdmin ? 'text-amber-700 font-semibold' : ''}`}>{h}</span>
                      ) : h}
                    </th>
                  )
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleProducts.length > 0 ? (
                <>
                  {visibleProducts.map((product, index) =>
                    updatingProductId === product._id ? (
                      <UpdatingRowSkeleton key={product._id} />
                    ) : (
                      <tr key={product._id}
                        className={`group hover:bg-blue-50/30 transition-colors align-top
                          ${selectedIds.includes(product._id) ? "bg-indigo-50/40" : ""}`}
                      >
                        {/* Checkbox — admin only */}
                        {isAdmin && (
                          <td className="px-3 py-3.5 w-8">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(product._id)}
                              onChange={(e) => onSelectId?.(product._id, e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                            />
                          </td>
                        )}
                        {/* # */}
                        <td className="px-4 py-3.5 text-gray-400 text-xs w-8">{index + 1}</td>

                        {/* Product */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0 shadow-sm">
                              {product.image
                                ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                                : <Package size={14} className="text-gray-300" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
                                {product.name}
                              </p>
                              {/* Badges inline — flex-wrap prevents row height explosion */}
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {product.isNewArrival && (
                                  <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                                    ✨ NEW
                                  </span>
                                )}
                                {product.isBonanza && (
                                  <span className="text-[9px] font-bold bg-orange-100 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full">
                                    🎉 DEAL
                                  </span>
                                )}
                                {product.isStaffOnly && (
                                  <span className="text-[9px] font-bold bg-red-100 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-full">
                                    🔒 STAFF
                                  </span>
                                )}
                              </div>
                              {product.supplierId && (
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{product.supplierId.name}</p>
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
                          <StockBadge stock={product.stock} threshold={product.individualLowStockThreshold ?? lowStockThreshold} />
                          {product.individualLowStockThreshold !== null && product.individualLowStockThreshold !== undefined && (
                            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border
                              ${product.individualLowStockAlertEnabled !== false
                                ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-gray-50 text-gray-400 border-gray-100 line-through"}`}>
                              🔔 ≤{product.individualLowStockThreshold}
                            </span>
                          )}
                          {product.stock > 0 && product.stock <= (product.individualLowStockThreshold ?? lowStockThreshold) && product.supplierId && (
                            <ReorderHint supplier={product.supplierId} />
                          )}
                        </td>

                        {/* Batch number */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <BatchBadge batchNumber={product.batchNumber} highlight={!!batchSearch && !!(product.batchNumber || "").toLowerCase().includes(batchSearch.toLowerCase())} />
                        </td>

                        {/* Expiry date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <ExpiryBadge expiryDate={product.expiryDate} highlight={!!expiryDateFilter} />
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[200px]">
                          <p className="line-clamp-2 leading-relaxed">{product.description || "—"}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {/* New arrival quick-toggle */}
                            <button
                              onClick={() => onToggleNewArrival?.(product._id, product.isNewArrival)}
                              title={product.isNewArrival ? "Remove from New Arrivals" : "Mark as New Arrival"}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition text-base
                                ${product.isNewArrival
                                  ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                                  : "text-gray-300 hover:bg-indigo-50 hover:text-indigo-400"
                                }`}
                            >✨</button>
                            {/* Bonanza quick-toggle */}
                            <button
                              onClick={() => onToggleBonanza?.(product._id, product.isBonanza)}
                              title={product.isBonanza ? "Remove from Bonanza" : "Add to Bonanza"}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition text-base
                                ${product.isBonanza
                                  ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                                  : "text-gray-300 hover:bg-orange-50 hover:text-orange-400"
                                }`}
                            >🎉</button>
                            {/* Staff-only quick-toggle */}
                            <button
                              onClick={() => onToggleStaffOnly?.(product._id, product.isStaffOnly)}
                              title={product.isStaffOnly ? "Make visible to all (remove staff-only)" : "Mark as Staff-Only (hide from online)"}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition text-base
                                ${product.isStaffOnly
                                  ? "bg-red-100 text-red-500 hover:bg-red-200"
                                  : "text-gray-300 hover:bg-red-50 hover:text-red-400"
                                }`}
                            >🔒</button>
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
                  {/* no loading skeleton needed — pages are instant */}
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
        </div>

        {/* ── MOBILE CARDS ── */}
        <div
          ref={(el) => { mobileWrapRef.current = el; if (scrollRef) scrollRef.current = el; }}
          className="md:hidden"
        >
          {visibleProducts.length > 0 ? (
            <div className="divide-y divide-gray-200">
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
                  <div key={product._id} className={`px-4 py-4 hover:bg-gray-50/70 transition-colors ${selectedIds.includes(product._id) ? "bg-indigo-50/40" : ""}`}>
                    <div className="flex gap-3">
                      {/* Checkbox — admin only, mobile */}
                      {isAdmin && (
                        <div className="flex items-start pt-1 shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product._id)}
                            onChange={(e) => onSelectId?.(product._id, e.target.checked)}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          />
                        </div>
                      )}
                      <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0 shadow-sm">
                        {product.image
                          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                          : <Package size={20} className="text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Name + supplier */}
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm leading-tight pr-1">
                              {product.name}
                              {product.isNewArrival && (
                                <span className="ml-1.5 text-[9px] font-bold bg-indigo-100 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-full align-middle">
                                  ✨ NEW
                                </span>
                              )}
                              {product.isBonanza && (
                                <span className="ml-1.5 text-[9px] font-bold bg-orange-100 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full align-middle">
                                  🎉 BONANZA
                                </span>
                              )}
                              {product.isStaffOnly && (
                                <span className="ml-1.5 text-[9px] font-bold bg-red-100 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-full align-middle">
                                  🔒 STAFF
                                </span>
                              )}
                            </p>
                            {product.supplierId && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{product.supplierId.name}</p>
                            )}
                        </div>

                        {/* Action buttons — separate row so they never crowd the name */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            <button
                              onClick={() => onToggleNewArrival?.(product._id, product.isNewArrival)}
                              title={product.isNewArrival ? "Remove from New Arrivals" : "Mark as New Arrival"}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition text-xs
                                ${product.isNewArrival
                                  ? "bg-indigo-100 text-indigo-600"
                                  : "text-gray-300 hover:bg-indigo-50 hover:text-indigo-400"}`}
                            >✨</button>
                            <button
                              onClick={() => onToggleBonanza?.(product._id, product.isBonanza)}
                              title={product.isBonanza ? "Remove from Bonanza" : "Add to Bonanza"}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition text-xs
                                ${product.isBonanza
                                  ? "bg-orange-100 text-orange-600"
                                  : "text-gray-300 hover:bg-orange-50 hover:text-orange-400"}`}
                            >🎉</button>
                            <button
                              onClick={() => onToggleStaffOnly?.(product._id, product.isStaffOnly)}
                              title={product.isStaffOnly ? "Remove staff-only" : "Mark staff-only"}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition text-xs
                                ${product.isStaffOnly
                                  ? "bg-red-100 text-red-500"
                                  : "text-gray-300 hover:bg-red-50 hover:text-red-400"}`}
                            >🔒</button>
                            <button onClick={() => onEdit(product)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-100 transition"
                              title="Edit">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => onDelete(product._id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-100 transition"
                              title="Delete">
                              <Trash2 size={13} />
                            </button>
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
                          <StockBadge stock={product.stock} threshold={product.individualLowStockThreshold ?? lowStockThreshold} />
                        </div>
                        {/* Per-product low-stock threshold badge */}
                        {product.individualLowStockThreshold !== null && product.individualLowStockThreshold !== undefined && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border
                              ${product.individualLowStockAlertEnabled !== false
                                ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-gray-50 text-gray-400 border-gray-100 line-through"}`}>
                              🔔 Alert ≤{product.individualLowStockThreshold}
                            </span>
                          </div>
                        )}
                        {/* Batch + Expiry on mobile */}
                        {(product.batchNumber || product.expiryDate) && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {product.batchNumber && (
                              <BatchBadge
                                batchNumber={product.batchNumber}
                                highlight={!!batchSearch && (product.batchNumber || "").toLowerCase().includes(batchSearch.toLowerCase())}
                              />
                            )}
                            {product.expiryDate && (
                              <ExpiryBadge expiryDate={product.expiryDate} highlight={!!expiryDateFilter} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {product.description && (
                      <p className="mt-2 text-xs text-gray-400 line-clamp-2 leading-relaxed">{product.description}</p>
                    )}
                    {product.stock > 0 && product.stock <= lowStockThreshold && product.supplierId && (
                      <div className="mt-2"><ReorderHint supplier={product.supplierId} /></div>
                    )}
                  </div>
                )
              )}

              {/* no loading skeleton — pages are instant */}
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

        {/* ── PAGINATION BAR — shown below both desktop table and mobile cards ── */}
        {totalPages > 1 && (
          <PaginationBar
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={products.length}
            pageSize={PAGE_SIZE}
            startIdx={startIdx}
            jumpInput={jumpInput}
            setJumpInput={setJumpInput}
            goToPage={goToPage}
            handleJumpSubmit={handleJumpSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default ProductTable;
