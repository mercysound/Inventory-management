import React, { useState, useRef, useCallback, useEffect } from "react";
import { Pencil, Trash2, Plus, Trash, Phone, Mail } from "lucide-react";

const PAGE_SIZE = 20;

const StockBadge = ({ stock }) => {
  if (stock === 0)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">{stock}</span>;
  if (stock < 5)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">{stock}</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-100">{stock}</span>;
};

const SkeletonRows = () =>
  [...Array(4)].map((_, i) => (
    <tr key={i} className="animate-pulse border-b border-gray-50">
      <td className="px-4 py-3"><div className="h-3 w-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-9 h-9 bg-gray-200 rounded-md" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded" style={{ width: `${90 + (i * 17) % 60}px` }} /></td>
      <td className="px-4 py-3"><div className="h-5 w-20 bg-gray-100 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-8 bg-gray-100 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-32" /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 justify-center">
          <div className="w-7 h-7 bg-gray-200 rounded-md" />
          <div className="w-7 h-7 bg-gray-200 rounded-md" />
        </div>
      </td>
    </tr>
  ));

const ProductTable = ({ products, onEdit, onDelete, onAddClick, onViewDeleted }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef(null);
  const tableWrapRef = useRef(null);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock < 5).length;

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
    setVisibleCount(PAGE_SIZE);
    if (tableWrapRef.current) tableWrapRef.current.scrollTop = 0;
  }, [products]);

  return (
    <div className="w-full bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">

      {/* STAT BAR */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{products.length} products</span>
        {outOfStock > 0 && (
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
            {outOfStock} out of stock
          </span>
        )}
        {lowStock > 0 && (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            {lowStock} low stock
          </span>
        )}
        <span className="ml-auto text-gray-400">
          Showing {visibleProducts.length} of {products.length}
        </span>
      </div>

      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Product list</h2>
        <div className="flex gap-2">
          <button
            onClick={onViewDeleted}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            <Trash size={13} /> View deleted
          </button>
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <Plus size={13} /> Add product
          </button>
        </div>
      </div>

      {/* SCROLLABLE TABLE */}
      <div
        ref={tableWrapRef}
        className="overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              {["#", "Image", "Name", "Category", "Price", "Stock", "Description", ""].map((h, i) => (
                <th
                  key={i}
                  className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide bg-gray-50 border-b border-gray-100 text-gray-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleProducts.length > 0 ? (
              <>
                {visibleProducts.map((product, index) => (
                  <tr
                    key={product._id}
                    className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none align-middle"
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">{index + 1}</td>

                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-md border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[9px] text-gray-400 text-center px-0.5 leading-tight">
                            No image
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {product.name}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100 whitespace-nowrap">
                        {product.categoryId?.name || "N/A"}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">
                      &#8358;{Number(product.price).toLocaleString()}
                    </td>

                    {/* Stock + reorder hint */}
                    <td className="px-4 py-3">
                      <StockBadge stock={product.stock} />
                      {product.stock < 5 && product.supplierId && (
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          <span className="text-[10px] text-gray-400">Reorder from:</span>
                          <span className="text-[10px] font-medium text-gray-600">
                            {product.supplierId.name}
                          </span>
                          {product.supplierId.phone && (
                            <a
                              href={`tel:${product.supplierId.phone}`}
                              className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:underline"
                            >
                              <Phone size={9} />
                              {product.supplierId.phone}
                            </a>
                          )}
                          {product.supplierId.email && (
                            <a
                              href={`mailto:${product.supplierId.email}`}
                              className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline"
                            >
                              <Mail size={9} />
                              {product.supplierId.email}
                            </a>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px]">
                      <p className="line-clamp-2">{product.description || "—"}</p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(product)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-blue-500 hover:bg-blue-50 transition"
                          title="Edit product"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(product._id)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 transition"
                          title="Delete product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {isLoading && <SkeletonRows />}
              </>
            ) : (
              <tr>
                <td colSpan="8" className="text-center text-gray-400 py-14 italic text-sm">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div ref={sentinelRef} style={{ height: 1 }} />

        {!hasMore && products.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-4 border-t border-gray-50">
            All {products.length} products loaded
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductTable;