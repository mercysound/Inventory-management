import React, { useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import useEscapeToClose from "../../share-component/receipt/useEscapeToClose";

const SupplierForm = ({
  formData,
  setFormData,
  editSupplier,
  handleSubmit,
  closeModal,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Lock scroll + ESC key
  useEscapeToClose(true, closeModal);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const scroller = document.getElementById("main-scroll");
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      const scroller = document.getElementById("main-scroll");
      if (scroller) scroller.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[9999]" style={{ padding: "16px" }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative flex flex-col my-auto"
        style={{ maxHeight: "92vh" }}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editSupplier ? "Edit supplier" : "Add new supplier"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editSupplier
                ? "Update the supplier information below"
                : "Only the supplier name is required — everything else is optional"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition ml-4 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 flex flex-col gap-4"
        >
          {/* Name — required */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Supplier name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              placeholder="e.g. Dangote Supplies Ltd"
              required
              className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
            />
          </div>

          {/* Two column grid for optional fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Contact person
                <span className="text-gray-300 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson || ""}
                onChange={handleChange}
                placeholder="e.g. John Adeola"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Phone
                <span className="text-gray-300 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
  type="text"
  inputMode="tel"
  name="phone"
  value={formData.phone || ""}
  onChange={(e) => {
    // Only allow digits and leading +
    const cleaned = e.target.value.replace(/[^\d+]/g, "");
    setFormData((prev) => ({ ...prev, phone: cleaned }));
  }}
  maxLength={14}
  placeholder="e.g. 08012345678"
  className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
/>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Email
                <span className="text-gray-300 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
                placeholder="supplier@example.com"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Address
                <span className="text-gray-300 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                placeholder="e.g. 12 Market Road, Lagos"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
              />
            </div>
          </div>

          {/* Notes — full width */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Notes
              <span className="text-gray-300 font-normal normal-case ml-1">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              placeholder="Payment terms, delivery days, special instructions..."
              rows={3}
              className="border border-gray-200 p-2.5 rounded-lg w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              {editSupplier ? "Save changes" : "Add supplier"}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
};

export default SupplierForm;