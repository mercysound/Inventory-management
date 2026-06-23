import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, ImagePlus, Loader2 } from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";

const MAX_IMAGES = 5;

// ── Debounce hook ─────────────────────────────────────────────────────────────
const useDebounce = (fn, delay) => {
  const timerRef = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

// ── Single image slot in the picker grid ─────────────────────────────────────
const ImageSlot = ({ src, onRemove, index }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.85 }}
    transition={{ duration: 0.18 }}
    className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-100 bg-gray-50 group"
  >
    <img src={src} alt={`Product image ${index + 1}`} className="w-full h-full object-cover" />
    {/* Primary badge on first image */}
    {index === 0 && (
      <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">
        Primary
      </span>
    )}
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full
        flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
      aria-label="Remove image"
    >
      <X size={11} />
    </button>
  </motion.div>
);

// ── Add slot (upload from file or camera) ────────────────────────────────────
const AddSlot = ({ onFileSelect, onCameraCapture, disabled }) => {
  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);

  return (
    <div className="relative aspect-square rounded-xl border-2 border-dashed border-gray-200
      bg-gray-50 flex flex-col items-center justify-center gap-1.5 hover:border-indigo-300
      hover:bg-indigo-50/30 transition-all cursor-pointer group"
    >
      {disabled ? (
        <span className="text-xs text-gray-400 text-center px-2">Max {MAX_IMAGES} images reached</span>
      ) : (
        <>
          <ImagePlus size={20} className="text-gray-300 group-hover:text-indigo-400 transition" />
          <span className="text-[10px] text-gray-400 font-medium">Add image</span>

          {/* Hover action buttons */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2
            opacity-0 group-hover:opacity-100 transition-all bg-white/90 rounded-xl p-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700
                text-white text-xs font-semibold py-1.5 rounded-lg transition"
            >
              <Upload size={12} /> Gallery
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-800
                text-white text-xs font-semibold py-1.5 rounded-lg transition"
            >
              <Camera size={12} /> Camera
            </button>
          </div>
        </>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onCameraCapture(e.target.files)}
      />
    </div>
  );
};

// ── Main ProductForm component ────────────────────────────────────────────────
const ProductForm = ({
  open,
  editProduct,
  formData,
  setFormData,
  categories,
  suppliers,
  onSubmit,
  onClose,
  // imageFiles + setImageFiles: new File objects to upload
  imageFiles,
  setImageFiles,
  // keptImageUrls + setKeptImageUrls: existing URLs admin wants to keep
  keptImageUrls,
  setKeptImageUrls,
}) => {
  const [loading,       setLoading]       = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftStatus,   setDraftStatus]   = useState("");
  const [draftSavedAt,  setDraftSavedAt]  = useState(null);

  // Local preview URLs for newly selected files
  const [newPreviews, setNewPreviews] = useState([]);

  const isAddMode = !editProduct;

  // ── Draft persistence ─────────────────────────────────────────────────────
  const persistDraft = useCallback(async (data) => {
    if (!isAddMode) return;
    const { image, removeImage, ...safeDraft } = data;
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
    } catch { setDraftStatus("error"); }
  }, [isAddMode]);

  const debouncedSaveDraft = useDebounce(persistDraft, 1500);

  // ── Load draft when opening in add mode ──────────────────────────────────
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
      } catch { /* silently fail */ }
    };
    fetchDraft();
  }, [open]);

  // ── On edit mode: populate keptImageUrls from product's existing images ──
  useEffect(() => {
    if (!open) return;
    if (editProduct) {
      // formData.images is set by Product.jsx from the product's images array
      const existing = Array.isArray(formData.images)
        ? formData.images.filter(Boolean)
        : formData.image ? [formData.image] : [];
      setKeptImageUrls(existing);
      setNewPreviews([]);
      setImageFiles([]);
    } else {
      // Add mode: clear everything
      setKeptImageUrls([]);
      setNewPreviews([]);
      setImageFiles([]);
    }
  }, [open, editProduct]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // ── Revoke object URLs on unmount to avoid memory leaks ─────────────────
  useEffect(() => {
    return () => newPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [newPreviews]);

  // ── Field handlers ────────────────────────────────────────────────────────
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

  // ── Image helpers ─────────────────────────────────────────────────────────
  const totalImageCount = keptImageUrls.length + newPreviews.length;
  const slotsRemaining  = MAX_IMAGES - totalImageCount;

  const addFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const available = MAX_IMAGES - totalImageCount;
    if (available <= 0) return;
    const toAdd = Array.from(fileList).slice(0, available);
    const previews = toAdd.map((f) => URL.createObjectURL(f));
    setNewPreviews((prev) => [...prev, ...previews]);
    setImageFiles((prev) => [...prev, ...toAdd]);
  };

  // Remove an existing Cloudinary URL from keptImageUrls
  const removeKeptImage = (index) => {
    setKeptImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove a newly selected file (and its preview)
  const removeNewImage = (index) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Clear draft ───────────────────────────────────────────────────────────
  const clearServerDraft = async () => {
    try { await axiosInstance.delete("/settings/product-draft"); } catch { /* ignore */ }
  };

  const handleClearDraft = async () => {
    await clearServerDraft();
    setFormData({ name: "", description: "", price: "", wholesalePrice: "", stock: "", categoryId: "", supplierId: "", image: "", removeImage: false });
    setKeptImageUrls([]);
    setNewPreviews([]);
    setImageFiles([]);
    setDraftStatus("");
    setDraftSavedAt(null);
    setDraftRestored(false);
  };

  const formatSavedAt = (iso) => {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    return `${mins} mins ago`;
  };

  const hasDraftContent = Object.entries(formData).some(
    ([k, v]) => !["image", "removeImage", "_imageName", "images"].includes(k) && v !== "" && v !== false && v !== null
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {editProduct ? "Edit product" : "Add product"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editProduct ? "Update the product details below" : "Fill in the details for the new product"}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 disabled:opacity-40 transition">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-5">

          {/* ── Draft restored banner ───────────────────────────────────── */}
          <AnimatePresence>
            {draftRestored && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                <span className="text-base shrink-0">📋</span>
                <div className="flex-1">
                  <p className="font-semibold">Draft restored</p>
                  <p className="text-amber-600 mt-0.5">
                    Your previously typed details have been restored across devices.
                    {draftSavedAt && <span className="ml-1 text-amber-500">Saved {formatSavedAt(draftSavedAt)}.</span>}
                  </p>
                </div>
                <button onClick={() => setDraftRestored(false)} className="text-amber-400 hover:text-amber-600 font-bold shrink-0">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Auto-save status ────────────────────────────────────────── */}
          {isAddMode && hasDraftContent && !draftRestored && (
            <div className="flex items-center gap-1.5 text-xs">
              {draftStatus === "saving"  && <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /><span className="text-amber-600">Saving draft…</span></>}
              {draftStatus === "saved"   && <><span className="w-2 h-2 rounded-full bg-green-400" /><span className="text-green-600">Draft saved{draftSavedAt && <span className="text-gray-400 ml-1">· {formatSavedAt(draftSavedAt)}</span>}</span></>}
              {draftStatus === "error"   && <><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-red-500">Save failed — check connection</span></>}
              {draftStatus === ""        && <><span className="w-2 h-2 rounded-full bg-gray-300" /><span className="text-gray-400">Draft auto-saves as you type</span></>}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (loading) return;
              setLoading(true);
              try {
                await onSubmit();
                if (isAddMode) await clearServerDraft();
              } finally {
                setLoading(false);
              }
            }}
            className="space-y-4"
          >
            {/* ── Product name ─────────────────────────────────────────── */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Product name</label>
              <input name="name" value={formData.name} onChange={handleChange}
                placeholder="e.g. Wireless Headset"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                required />
            </div>

            {/* ── Description ──────────────────────────────────────────── */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                placeholder="Brief product description" rows={2}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                required />
            </div>

            {/* ── Prices ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Retail price (₦)
                  <span className="ml-1 text-indigo-400 normal-case font-normal text-[10px]">customers</span>
                </label>
                <input type="number" name="price" value={formData.price}
                  onChange={handleNumberChange("price")} placeholder="0" min="0"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Wholesale (₦)
                  <span className="ml-1 text-amber-500 normal-case font-normal text-[10px]">optional</span>
                </label>
                <input type="number" name="wholesalePrice" value={formData.wholesalePrice ?? ""}
                  onChange={handleNumberChange("wholesalePrice")} placeholder="Optional" min="0"
                  className="w-full border border-amber-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-transparent bg-amber-50/30" />
              </div>
            </div>

            {/* ── Stock + Category ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Stock</label>
                <input type="number" name="stock" value={formData.stock}
                  onChange={handleNumberChange("stock")} placeholder="0" min="0"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                <select name="categoryId" value={formData.categoryId} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  required>
                  <option value="">Select category</option>
                  {categories?.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Supplier ─────────────────────────────────────────────── */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Supplier</label>
              <select name="supplierId" value={formData.supplierId || ""} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent">
                <option value="">No supplier</option>
                {suppliers?.map((sup) => (
                  <option key={sup._id} value={sup._id}>{sup.name}</option>
                ))}
              </select>
            </div>

            {/* ── Batch number + Expiry date (optional, admin/staff only) ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Batch Number
                  <span className="ml-1 text-gray-400 normal-case font-normal text-[10px]">optional</span>
                </label>
                <input
                  type="text"
                  name="batchNumber"
                  value={formData.batchNumber || ""}
                  onChange={handleChange}
                  placeholder="e.g. LOT-2024-001"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Expiry Date
                  <span className="ml-1 text-gray-400 normal-case font-normal text-[10px]">optional</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate
                    ? new Date(formData.expiryDate).toISOString().slice(0, 10)
                    : ""}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
            </div>

            {/* ── New Arrival toggle ───────────────────────────────────── */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
              ${formData.isNewArrival
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
              onClick={() => {
                const updated = { ...formData, isNewArrival: !formData.isNewArrival };
                setFormData(updated);
                debouncedSaveDraft(updated);
              }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all
                ${formData.isNewArrival ? "bg-indigo-600" : "bg-gray-100"}`}>
                <span className="text-lg">{formData.isNewArrival ? "✨" : "🏷️"}</span>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${formData.isNewArrival ? "text-indigo-700" : "text-gray-700"}`}>
                  New Arrival
                  {formData.isNewArrival && (
                    <span className="ml-2 text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {formData.isNewArrival
                    ? "This product is featured as a New Arrival. Click to remove it."
                    : "Mark this product as a New Arrival so it appears at the top of the product page. Optional."}
                </p>
              </div>
            </div>

            {/* ── Bonanza toggle ────────────────────────────────────────── */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
              ${formData.isBonanza
                ? "border-orange-400 bg-orange-50"
                : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
              onClick={() => {
                const updated = { ...formData, isBonanza: !formData.isBonanza };
                setFormData(updated);
                debouncedSaveDraft(updated);
              }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all
                ${formData.isBonanza ? "bg-orange-500" : "bg-gray-100"}`}>
                <span className="text-lg">{formData.isBonanza ? "🎉" : "🏷️"}</span>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${formData.isBonanza ? "text-orange-700" : "text-gray-700"}`}>
                  Bonanza / Special Deal
                  {formData.isBonanza && (
                    <span className="ml-2 text-[10px] font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {formData.isBonanza
                    ? "This product appears in the Bonanza tab — visible to all buyers."
                    : "Feature this product in the Bonanza tab for special deals and cheap offers. Optional."}
                </p>
              </div>
            </div>

            {/* ── Staff-only toggle ─────────────────────────────────────── */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
              ${formData.isStaffOnly
                ? "border-red-400 bg-red-50"
                : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
              onClick={() => {
                const updated = { ...formData, isStaffOnly: !formData.isStaffOnly };
                setFormData(updated);
                debouncedSaveDraft(updated);
              }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all
                ${formData.isStaffOnly ? "bg-red-500" : "bg-gray-100"}`}>
                <span className="text-lg">{formData.isStaffOnly ? "🔒" : "🌐"}</span>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${formData.isStaffOnly ? "text-red-700" : "text-gray-700"}`}>
                  Staff-Only (In-store)
                  {formData.isStaffOnly && (
                    <span className="ml-2 text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      Hidden from online
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {formData.isStaffOnly
                    ? "Only staff can purchase this at the physical counter. Not visible to online customers."
                    : "Mark this as staff-only to hide it from online customer and wholesale product pages. Optional."}
                </p>
              </div>
            </div>

            {/* Expiry info note */}
            {(formData.expiryDate) && (() => {
              const days = Math.ceil((new Date(formData.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
              if (days <= 0) return (
                <p className="text-xs text-red-500 font-semibold -mt-2">
                  ⚠️ This product has already expired.
                </p>
              );
              if (days <= 21) return (
                <p className="text-xs text-amber-600 font-semibold -mt-2">
                  ⚠️ Expires in {days} day{days !== 1 ? "s" : ""} — within the 3-week warning window.
                </p>
              );
              return null;
            })()}

            {/* ── Images section ───────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Product images
                </label>
                <span className={`text-xs font-medium ${totalImageCount >= MAX_IMAGES ? "text-amber-500" : "text-gray-400"}`}>
                  {totalImageCount}/{MAX_IMAGES} images
                </span>
              </div>

              {/* Optional-image note */}
              <p className="text-xs text-gray-400 mb-3">
                Images are optional. The first image is used as the product thumbnail.
                You can add up to {MAX_IMAGES} images — from your gallery or via camera.
              </p>

              {/* Image grid: existing kept + new previews + add slot */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <AnimatePresence>
                  {/* Kept existing images */}
                  {keptImageUrls.map((url, i) => (
                    <ImageSlot key={`kept-${i}`} src={url} index={i} onRemove={removeKeptImage} />
                  ))}
                  {/* New file previews */}
                  {newPreviews.map((url, i) => (
                    <ImageSlot
                      key={`new-${i}`}
                      src={url}
                      index={keptImageUrls.length + i}
                      onRemove={removeNewImage}
                    />
                  ))}
                </AnimatePresence>

                {/* Add slot — hidden when at max */}
                {totalImageCount < MAX_IMAGES && (
                  <AddSlot
                    onFileSelect={addFiles}
                    onCameraCapture={addFiles}
                    disabled={totalImageCount >= MAX_IMAGES}
                  />
                )}
              </div>

              {totalImageCount > 0 && (
                <p className="text-[10px] text-gray-400 mt-2">
                  💡 Hover over an image and click ✕ to remove it. Drag is not supported — reorder by removing and re-adding.
                </p>
              )}
            </div>

            {/* ── Pricing info box ─────────────────────────────────────── */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              <p className="font-semibold mb-0.5">🏪 Pricing</p>
              <p>Retail price is what <strong>customers</strong> pay. Wholesale price is what <strong>wholesale account holders</strong> see.</p>
            </div>

            {/* ── Clear draft ──────────────────────────────────────────── */}
            {isAddMode && hasDraftContent && (
              <button type="button" onClick={handleClearDraft}
                className="text-xs text-gray-400 hover:text-red-500 underline transition w-fit">
                🗑 Clear draft and start fresh
              </button>
            )}

            {/* ── Action buttons ───────────────────────────────────────── */}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={loading}
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2 ${
                  loading ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}>
                {loading
                  ? <><Loader2 size={15} className="animate-spin" />{editProduct ? "Saving…" : "Adding…"}</>
                  : editProduct ? "Save changes" : "Add product"}
              </button>
              <button type="button" onClick={onClose} disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
