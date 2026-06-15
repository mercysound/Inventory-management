import React from "react";
import { Pencil, Trash2, Mail, Phone, MapPin, User, Package, AlertTriangle } from "lucide-react";

const SupplierTable = ({ suppliers, handleEdit, handleDelete }) => {
  if (suppliers.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-100">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <User size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">No suppliers yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Add your first supplier using the button above
        </p>
      </div>
    );

  const totalProducts = suppliers.reduce((s, sup) => s + (sup.productCount || 0), 0);
  const totalLowStock = suppliers.reduce((s, sup) => s + (sup.lowStockCount || 0), 0);
  const totalOutOfStock = suppliers.reduce((s, sup) => s + (sup.outOfStockCount || 0), 0);
  const activeSuppliers = suppliers.filter((s) => s.productCount > 0).length;

  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      {/* SUMMARY BAR */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 text-xs items-center">
        <span className="font-medium text-gray-700">
          {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-indigo-600 font-medium">{activeSuppliers} actively supplying</span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500">{totalProducts} products total</span>
        {totalLowStock > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-amber-600 font-medium flex items-center gap-1">
              <AlertTriangle size={10} />
              {totalLowStock} low stock
            </span>
          </>
        )}
        {totalOutOfStock > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-red-500 font-medium flex items-center gap-1">
              <AlertTriangle size={10} />
              {totalOutOfStock} out of stock
            </span>
          </>
        )}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              {["#", "Supplier", "Contact", "Email", "Phone", "Address", "Products", "Stock status", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 bg-gray-50 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier, index) => (
              <tr
                key={supplier._id}
                className="border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors align-middle"
              >
                <td className="px-4 py-3 text-gray-400 text-xs">{index + 1}</td>

                {/* Supplier name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-blue-600">
                        {supplier.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 whitespace-nowrap">{supplier.name}</p>
                      {supplier.notes && (
                        <p className="text-[10px] text-gray-400 max-w-[140px] truncate">{supplier.notes}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Contact person */}
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {supplier.contactPerson || <span className="text-gray-300">—</span>}
                </td>

                {/* Email */}
                <td className="px-4 py-3">
                  {supplier.email ? (
                    <a
                      href={`mailto:${supplier.email}`}
                      className="flex items-center gap-1 text-blue-500 hover:underline text-xs whitespace-nowrap"
                    >
                      <Mail size={11} />
                      {supplier.email}
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>

                {/* Phone */}
                <td className="px-4 py-3">
                  {supplier.phone ? (
                    <a
                      href={`tel:${supplier.phone}`}
                      className="flex items-center gap-1 text-gray-600 hover:text-blue-500 text-xs whitespace-nowrap"
                    >
                      <Phone size={11} />
                      {supplier.phone}
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>

                {/* Address */}
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px]">
                  {supplier.address ? (
                    <span className="flex items-start gap-1">
                      <MapPin size={11} className="mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="line-clamp-2">{supplier.address}</span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                {/* Product count */}
                <td className="px-4 py-3">
                  {supplier.productCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Package size={9} />
                      {supplier.productCount} product{supplier.productCount !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-300">No products</span>
                  )}
                </td>

                {/* Stock status */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {supplier.outOfStockCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500 border border-red-100 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                        {supplier.outOfStockCount} out of stock
                      </span>
                    )}
                    {supplier.lowStockCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                        {supplier.lowStockCount} low stock
                      </span>
                    )}
                    {supplier.outOfStockCount === 0 && supplier.lowStockCount === 0 && supplier.productCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-600 border border-green-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                        All stocked
                      </span>
                    )}
                    {supplier.productCount === 0 && (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-blue-500 hover:bg-blue-50 transition"
                      title="Edit supplier"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier._id)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 transition"
                      title={supplier.productCount > 0 ? "Cannot delete — has linked products" : "Delete supplier"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden divide-y divide-gray-50">
        {suppliers.map((supplier) => (
          <div key={supplier._id} className="p-4">

            {/* Card header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-blue-600">
                    {supplier.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{supplier.name}</p>
                  {supplier.contactPerson && (
                    <p className="text-xs text-gray-400">{supplier.contactPerson}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(supplier)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(supplier._id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Product + stock badges */}
            <div className="flex flex-wrap gap-1.5 mb-3 pl-11">
              {supplier.productCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Package size={9} />
                  {supplier.productCount} product{supplier.productCount !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-[11px] text-gray-300">No products linked</span>
              )}
              {supplier.outOfStockCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500 border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  {supplier.outOfStockCount} out of stock
                </span>
              )}
              {supplier.lowStockCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  {supplier.lowStockCount} low stock
                </span>
              )}
              {supplier.outOfStockCount === 0 && supplier.lowStockCount === 0 && supplier.productCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-600 border border-green-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  All stocked
                </span>
              )}
            </div>

            {/* Contact details */}
            <div className="space-y-1.5 pl-11">
              {supplier.email && (
                <a
                  href={`mailto:${supplier.email}`}
                  className="flex items-center gap-2 text-xs text-blue-500 hover:underline"
                >
                  <Mail size={11} /> {supplier.email}
                </a>
              )}
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="flex items-center gap-2 text-xs text-gray-600"
                >
                  <Phone size={11} /> {supplier.phone}
                </a>
              )}
              {supplier.address && (
                <p className="flex items-start gap-2 text-xs text-gray-500">
                  <MapPin size={11} className="mt-0.5 flex-shrink-0" />
                  {supplier.address}
                </p>
              )}
              {supplier.notes && (
                <p className="text-xs text-gray-400 italic pt-1.5 border-t border-gray-50 mt-1">
                  {supplier.notes}
                </p>
              )}
              {!supplier.email && !supplier.phone && !supplier.address && !supplier.notes && (
                <p className="text-xs text-gray-300 italic">No contact details added</p>
              )}
            </div>

            {/* Reorder call button on mobile */}
            {(supplier.outOfStockCount > 0 || supplier.lowStockCount > 0) && supplier.phone && (
              <div className="mt-3 pl-11">
                <a
                  href={`tel:${supplier.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition"
                >
                  <Phone size={11} />
                  Call to reorder
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplierTable;
