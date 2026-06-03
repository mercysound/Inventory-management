import React from "react";
import { motion } from "framer-motion";
import LoadingButton from "../../share-component/LoadingButton";

const SupplierForm = ({
  formData,
  setFormData,
  editSupplier,
  handleSubmit,
  closeModal,
  submitting,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center px-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-slate-950 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden border border-slate-800"
      >
        {/* Modal header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {editSupplier ? "Edit supplier" : "Add new supplier"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {editSupplier
                ? "Update the supplier information below"
                : "Only the supplier name is required — everything else is optional"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition ml-4 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
        >
          {/* Name — required */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wide mb-1">
              Supplier name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              placeholder="e.g. Dangote Supplies Ltd"
              required
              className="border border-slate-700 bg-slate-900 p-2.5 rounded-lg w-full text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Two column grid for optional fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wide mb-1">
                Contact person
                <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson || ""}
                onChange={handleChange}
                placeholder="e.g. John Adeola"
                className="border border-slate-700 bg-slate-900 p-2.5 rounded-lg w-full text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wide mb-1">
                Phone
                <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
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
  className="border border-slate-700 bg-slate-900 p-2.5 rounded-lg w-full text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
/>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wide mb-1">
                Email
                <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
                placeholder="supplier@example.com"
                className="border border-slate-700 bg-slate-900 p-2.5 rounded-lg w-full text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wide mb-1">
                Address
                <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                placeholder="e.g. 12 Market Road, Lagos"
                className="border border-slate-700 bg-slate-900 p-2.5 rounded-lg w-full text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              className="border border-slate-700 bg-slate-900 p-2.5 rounded-lg w-full text-sm text-slate-100 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <LoadingButton
              type="submit"
              loading={!!submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              {editSupplier ? "Save changes" : "Add supplier"}
            </LoadingButton>
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SupplierForm;