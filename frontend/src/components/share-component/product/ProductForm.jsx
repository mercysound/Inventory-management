import React, { useEffect, useState, useRef, useCallback } from "react";
import axiosInstance from "../../../utils/axiosInstance";

// ── Debounce hook ─────────────────────────────────────────────────────────────
const useDebounce = (fn, delay) => {
  const timerRef = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

const ProductForm = ({
  open,
  editProduct,
  formData,
  setFormData,
  categories,
  suppliers,
  onSubmit,
  onClose,
  setImage,
}) => {
  const [loading,        setLoading]        = useState(false);
  const [preview,        setPreview]        = useState("");
  const [draftRestored,  setDraftRestored]  = useState(false);
  const [draftStatus,    setDraftStatus]    = useState(""); // "saving" | "saved" | "error" | ""
  const [draftSavedAt,   setDraftSavedAt]   = useState(null);
  const isAddMode = !editProduct;

  // ── Save draft to server (debounced 1.5s) ────────────────────────────────
  const persistDraft = useCallback(async (data) => {
    if (!isAddMode) return;
    // Strip fields that can't meaningfully be restored cross-device
    const { image, removeImage, ...safeDraft } = data;
    // Don't save if all meaningful fields are empty
    const hasContent = Object.entries(safeDraft).some(
      ([k, v]) => k !== "_imageName" && v !== "" && v !== null && v !== undefined
    );
    if (!hasContent) return;

    setDraftStatus("saving");
    try {
      const res = await axiosInstance.put("/settings/product-draft", { draft: safeDraft });
      if (res.data.success) {
        setDraftStatus("saved");
        setDraftSavedAt(res.data.savedAt || new Date().toISOString());
      }
    } catch {
      setDraftStatus("error");
    }
  }, [isAddMode]);

  const debouncedSaveDraft = useDebounce(persistDraft, 1500);

  // ── Load draft from server when modal opens in ADD mode ──────────────────
  useEffect(() => {
    if (!open || !isAddMode) return;

    const fetchDraft = async () => {
      try {
        const res = await axiosInstance.get("/settings/product-draft");
        if (res.data.success && res.data.draft) {
          const draft = res.data.draft;
          const hasContent = Object.entries(draft).some(
            ([k, v]) => k !== "_imageName" && v !== "" && v !== null && v !== undefined
          );
          if (hasContent) {
            setFormData((prev) => ({ ...prev, ...draft }));
            setDraftRestored(true);
            setDraftSavedAt(res.data.savedAt);
            const t = setTimeout(() => setDraftRestored(false), 5000);
            return () => clearTimeout(t);
          }
        }
      } catch {
        // Silently fail — draft load is non-critical
      }
    };

    fetchDraft();
  }, [open]);

  // ── Edit mode: set image preview from existing product data ─────────────
  useEffect(() => {
    if (editProduct && formData?.image) {
      setPreview(formData.image);
    } else if (!editProduct) {
      setPreview("");
    }
  }, [editProduct, formData?.image]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // ── Field change handler — triggers debounced server save ─────────────────
  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    setFormData(updated);
    debouncedSaveDraft(updated);
  };

  const handleNumberChange = (field) => (e) => {
    const value = e.target.value;
    if (value === "") {
      const updated = { ...formData, [field]: "" };
      setFormData(updated);
      debouncedSaveDraft(updated);
      return;
    }
    const num = Number(value);
    if (num < 0) return;
    const updated = { ...formData, [field]: num };
    setFormData(updated);
    debouncedSaveDraft(updated);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    // Save image name as reminder (can't serialize File object cross-device)
    const updated = { ...formData, _imageName: file.name };
    setFormData(updated);
    debouncedSaveDraft(updated);
  };

  const handleRemoveImage = () => {
    setPreview("");
    setImage(null);
    const updated = { ...formData, image: "", removeImage: true };
    setFormData(updated);
    debouncedSaveDraft(updated);
  };

  // ── Clear draft from server ───────────────────────────────────────────────
  const clearServerDraft = async () => {
    try {
      await axiosInstance.delete("/settings/product-draft");
    } catch {
      // Silently fail
    }
  };

  const handleClearDraft = async () => {
    await clearServerDraft();
    setFormData({
      name: "", description: "", price: "", wholesalePrice: "",
      stock: "", categoryId: "", supplierId: "", image: "", removeImage: false,
    });
    setPreview("");
    setImage(null);
    setDraftStatus("");
    setDraftSavedAt(null);
    setDraftRestored(false);
  };

  // ── Format "saved X minutes ago" ─────────────────────────────────────────
  const formatSavedAt = (isoDate) => {
    if (!isoDate) return "";
    const mins = Math.floor((Date.now() - new Date(isoDate)) / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    return `${mins} mins ago`;
  };

  const hasDraftContent = Object.entries(formData).some(
    ([k, v]) => !["image", "removeImage", "_imageName"].includes(k) && v !== "" && v !== false && v !== null
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full sm:w-3/4 md:w-[560px] max-h-[90vh] overflow-y-auto relative">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editProduct ? "Edit product" : "Add product"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editProduct
                ? "Update the product details below"
                : "Fill in the details for the new product"}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 disabled:opacity-40 transition">
            ✕
          </button>
        </div>

        {/* ── Draft restored banner ── */}
        {draftRestored && (
          <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
            <span className="text-base flex-shrink-0">📋</span>
            <div className="flex-1">
              <p className="font-semibold">Draft restored from your account</p>
              <p className="mt-0.5 text-amber-700">
                Your previously entered details have been restored — they follow you across all devices.
                {draftSavedAt && (
                  <span className="ml-1 text-amber-500">
                    Last saved {formatSavedAt(draftSavedAt)}.
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => setDraftRestored(false)}
              className="text-amber-500 hover:text-amber-700 font-bold text-sm flex-shrink-0">✕</button>
          </div>
        )}

        {/* ── Auto-save status indicator ── */}
        {isAddMode && hasDraftContent && !draftRestored && (
          <div className="mb-3 flex items-center gap-1.5 text-xs">
            {draftStatus === "saving" && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                <span className="text-amber-600">Saving draft to your account...</span>
              </>
            )}
            {draftStatus === "saved" && (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                <span className="text-green-600">
                  Draft saved to your account
                  {draftSavedAt && <span className="text-gray-400 ml-1">· {formatSavedAt(draftSavedAt)}</span>}
                </span>
              </>
            )}
            {draftStatus === "error" && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="text-red-500">Draft save failed — check your connection</span>
              </>
            )}
            {draftStatus === "" && (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                <span className="text-gray-400">Draft auto-saves as you type</span>
              </>
            )}
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (loading) return;
            setLoading(true);
            try {
              await onSubmit();
              // ✅ Clear draft from server ONLY on successful save
              if (isAddMode) await clearServerDraft();
            } finally {
              setLoading(false);
            }
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">

            {/* NAME */}
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Product name
              </label>
              <input name="name" value={formData.name} onChange={handleChange}
                placeholder="e.g. Wireless Headset"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required />
            </div>

            {/* DESCRIPTION */}
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                placeholder="Brief product description" rows={2}
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required />
            </div>

            {/* RETAIL PRICE */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Retail price (₦)
                <span className="ml-1 text-blue-400 normal-case font-normal text-[10px]">— customers see this</span>
              </label>
              <input type="number" name="price" value={formData.price}
                onChange={handleNumberChange("price")} placeholder="0" min="0"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required />
            </div>

            {/* WHOLESALE PRICE */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Wholesale price (₦)
                <span className="ml-1 text-amber-500 normal-case font-normal text-[10px]">— optional</span>
              </label>
              <input type="number" name="wholesalePrice" value={formData.wholesalePrice ?? ""}
                onChange={handleNumberChange("wholesalePrice")} placeholder="Optional" min="0"
                className="border border-amber-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 bg-amber-50/40" />
            </div>

            {/* STOCK */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Stock
              </label>
              <input type="number" name="stock" value={formData.stock}
                onChange={handleNumberChange("stock")} placeholder="0" min="0"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Category
              </label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange}
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required>
                <option value="">Select category</option>
                {categories?.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* SUPPLIER */}
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Supplier
              </label>
              <select name="supplierId" value={formData.supplierId || ""} onChange={handleChange}
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400">
                <option value="">No supplier</option>
                {suppliers?.map((sup) => (
                  <option key={sup._id} value={sup._id}>{sup.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* IMAGE UPLOAD */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Product image
            </label>

            {/* Cross-device image reminder */}
            {isAddMode && !preview && formData._imageName && (
              <div className="mb-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                📸 You previously selected <strong>"{formData._imageName}"</strong>.
                Please re-select the image — it cannot be transferred across devices.
              </div>
            )}

            {preview ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={handleRemoveImage}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 transition">
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition">
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v10M7 10l5-5 5 5" />
                  <rect x="3" y="18" width="18" height="2" rx="1" fill="currentColor" opacity="0.2" />
                </svg>
                <span className="text-xs text-gray-400">Click to upload or drag & drop</span>
                <span className="text-[11px] text-gray-300">PNG, JPG, WEBP up to 5MB</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Wholesale info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">🏪 Pricing info</p>
            <p>
              Retail price is what <strong>customers</strong> pay.
              Wholesale price is what <strong>wholesale account holders</strong> see when they log in.
            </p>
          </div>

          {/* Clear draft button */}
          {isAddMode && hasDraftContent && (
            <button type="button" onClick={handleClearDraft}
              className="text-xs text-gray-400 hover:text-red-500 underline text-left transition w-fit">
              🗑 Clear draft and start fresh
            </button>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition ${
                loading ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}>
              {loading
                ? (editProduct ? "Saving..." : "Adding...")
                : (editProduct ? "Save changes" : "Add product")}
            </button>
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
