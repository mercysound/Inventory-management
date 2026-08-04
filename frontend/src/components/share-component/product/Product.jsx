import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Search, ScanLine, CalendarClock, X, Trash2, Star, ShieldOff, Tag, Layers, FileText } from "lucide-react";
import ProductTable from "./ProductTable";
import ProductForm from "./ProductForm";
import ProductSkeleton from "./ProductSkeleton";
import axiosInstance from "../../../utils/axiosInstance";
import DeletedProductsPopup from "./DeletedProductsPopup";

// ── Mode chooser modal — shown before opening the product form ───────────────
// Lets admin pick between the quick modal or full-page form.
const ModeChooserModal = ({ onModal, onFullPage, onClose, isEditing }) => createPortal(
  <div
    style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", padding: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-y-auto"
      style={{ maxHeight: "calc(100dvh - 32px)" }}
      onClick={e => e.stopPropagation()}
    >
      <div className="p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">
          {isEditing ? "How would you like to edit?" : "How would you like to add?"}
        </h2>
        <p className="text-xs text-gray-400 mb-5">Choose quick modal for simple products, full page for products with many details.</p>
        <div className="flex flex-col gap-3">
          <button onClick={onModal}
            className="flex items-start gap-3 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50
              hover:border-indigo-500 transition text-left">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <Layers size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-800">Quick Modal</p>
              <p className="text-xs text-gray-500 mt-0.5">Opens a compact pop-up. Best for simple products.</p>
            </div>
          </button>
          <button onClick={onFullPage}
            className="flex items-start gap-3 p-4 rounded-xl border-2 border-violet-200 bg-violet-50
              hover:border-violet-500 transition text-left">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-violet-800">Full Page</p>
              <p className="text-xs text-gray-500 mt-0.5">Routes to a dedicated page. Best for variants, many images, and detailed products.</p>
            </div>
          </button>
        </div>
        <button onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </div>
  </div>,
  document.body
);

// Extract a readable message from an axios error
const parseApiError = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong. Please try again.";

const EMPTY_FORM = {
  name:           "",
  description:    "",
  price:          "",
  wholesalePrice: "",
  stock:          "",
  categoryId:     "",
  supplierId:     "",
  images:         [],
  image:          "",
  removeImage:    false,
  batchNumber:    "",
  expiryDate:     "",
  isNewArrival:   false,
  isBonanza:      false,
  isStaffOnly:    false,
  individualLowStockThreshold:    "",
  individualLowStockAlertEnabled: true,
  variants:       [],
};

const Product = () => {
  const navigate = useNavigate();
  const [openModal,         setOpenModal]         = useState(false);
  const [showChooser,       setShowChooser]       = useState(false);
  const [pendingEdit,       setPendingEdit]        = useState(null); // product to edit after mode chosen
  const [editProduct,       setEditProduct]       = useState(null);
  const [categories,        setCategories]        = useState([]);
  const [suppliers,         setSuppliers]         = useState([]);
  const [products,          setProducts]          = useState([]);
  const [filteredProducts,  setFilteredProducts]  = useState([]);
  const [selectedCategory,  setSelectedCategory]  = useState("");
  const [searchValue,       setSearchValue]       = useState("");
  const [batchSearch,       setBatchSearch]       = useState("");
  const [expiryDaysFilter,  setExpiryDaysFilter]  = useState("");   // "" = off; number string = "show expiring within N days"
  const productsRef         = useRef([]);
  const selectedCategoryRef = useRef("");
  const searchValueRef      = useRef("");
  const batchSearchRef      = useRef("");
  const expiryDaysRef       = useRef("");
  const batchScanInputRef   = useRef(null);
  const [loading,           setLoading]           = useState(false);
  const [imageFiles,        setImageFiles]        = useState([]);
  const [keptImageUrls,     setKeptImageUrls]     = useState([]);
  const [showDeletedPopup,  setShowDeletedPopup]  = useState(false);
  const [deletedProducts,   setDeletedProducts]   = useState([]);
  const [loadingDeleted,    setLoadingDeleted]    = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const scrollRef = useRef(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  // ── Bulk selection state ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([]);

  const handleSelectId = useCallback((id, checked) => {
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  }, []);

  const handleSelectPage = useCallback((pageIds, checked) => {
    setSelectedIds((prev) => {
      const without = prev.filter((id) => !pageIds.includes(id));
      return checked ? [...without, ...pageIds] : without;
    });
  }, []);

  const clearSelection = () => setSelectedIds([]);

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Soft-delete ${selectedIds.length} product(s)? They will move to the bin.`)) return;
    try {
      await axiosInstance.post("/products/batch/delete", { ids: selectedIds });
      toast.success(`${selectedIds.length} product(s) deleted`);
      clearSelection();
      fetchProducts();
    } catch { toast.error("Bulk delete failed"); }
  };

  const handleBulkFlag = async (flag, value) => {
    if (!selectedIds.length) return;
    const label = { isNewArrival: "New Arrival", isBonanza: "Bonanza", isStaffOnly: "Staff-Only" }[flag];
    try {
      await axiosInstance.post("/products/batch/flag", { ids: selectedIds, flag, value });
      toast.success(`${selectedIds.length} product(s) — ${label} ${value ? "ON" : "OFF"}`);
      // Optimistic update
      const update = (list) => list.map((p) =>
        selectedIds.includes(p._id)
          ? { ...p, [flag]: value, ...(flag === "isNewArrival" && value ? { newArrivalAt: new Date().toISOString() } : {}) }
          : p
      );
      productsRef.current = update(productsRef.current);
      setProducts((prev) => update(prev));
      setFilteredProducts((prev) => update(prev));
      clearSelection();
    } catch { toast.error("Bulk flag update failed"); }
  };

  // ── Fetch all products — skip if returning from full-page add/edit ──────
  const fetchProducts = useCallback(async (force = false) => {
    // If returning from add-product or edit-product, use cached data and skip the
    // network round-trip so the product list renders instantly without jumping to top.
    const prevPath = sessionStorage.getItem("melech_scroll_from") || "";
    const returningFromEdit =
      !force &&
      (prevPath.includes("/add-product") || prevPath.includes("/edit-product"));

    if (returningFromEdit) {
      const cached = sessionStorage.getItem("melech_products_cache");
      if (cached) {
        try {
          const { products: cachedProducts, categories: cachedCats, suppliers: cachedSups, threshold } = JSON.parse(cached);
          productsRef.current = cachedProducts;
          setProducts(cachedProducts);
          setCategories(cachedCats || []);
          setSuppliers(cachedSups || []);
          if (threshold !== undefined) setLowStockThreshold(threshold);
          setFilteredProducts(cachedProducts);
          setLoading(false);
          // After restoring from cache, do a background refresh to pick up the edit
          setTimeout(async () => {
            try {
              const res = await axiosInstance.get("/products");
              if (res.data.success) {
                const fresh = res.data.products;
                productsRef.current = fresh;
                setProducts(fresh);
                setFilteredProducts(fresh);
                sessionStorage.setItem("melech_products_cache", JSON.stringify({
                  products: fresh,
                  categories: res.data.categories,
                  suppliers:  res.data.suppliers,
                  threshold:  threshold,
                }));
              }
            } catch {}
          }, 800);
          return;
        } catch {}
      }
    }

    setLoading(true);
    try {
      const [prodRes, settingsRes] = await Promise.all([
        axiosInstance.get("/products"),
        axiosInstance.get("/settings").catch(() => ({ data: { settings: {} } })),
      ]);
      if (prodRes.data.success) {
        setCategories(prodRes.data.categories);
        setSuppliers(prodRes.data.suppliers);
        const newProducts = prodRes.data.products;
        productsRef.current = newProducts;
        setProducts(newProducts);
        const threshold = settingsRes?.data?.settings?.lowStockThreshold;
        if (threshold !== undefined) setLowStockThreshold(threshold);

        // Cache for next back-navigation restore
        sessionStorage.setItem("melech_products_cache", JSON.stringify({
          products:   newProducts,
          categories: prodRes.data.categories,
          suppliers:  prodRes.data.suppliers,
          threshold,
        }));

        const currentCat    = selectedCategoryRef.current;
        const currentSearch = searchValueRef.current;
        const currentBatch  = batchSearchRef.current;
        const currentExpiry = expiryDaysRef.current;
        setFilteredProducts(
          newProducts.filter((p) => {
            const matchesSearch   = currentSearch ? p.name.toLowerCase().includes(currentSearch.toLowerCase()) : true;
            const matchesCategory = currentCat    ? (p.categoryId?._id ?? p.categoryId) === currentCat         : true;
            const matchesBatch    = currentBatch  ? (p.batchNumber || "").toLowerCase().includes(currentBatch.toLowerCase()) : true;
            const matchesExpiry   = currentExpiry ? p.expiryDate && new Date(p.expiryDate) <= new Date(currentExpiry) : true;
            return matchesSearch && matchesCategory && matchesBatch && matchesExpiry;
          })
        );
      } else {
        toast.error("Error fetching products. Please try again");
      }
    } catch (error) {
      console.error("Error fetching products", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, []);

  // ── Central filter — reads from refs so it never has a stale closure ────────
  // Always call this after updating the ref values.
  const applyFilters = (search, category, batch, expiryDays) => {
    const s = search      !== undefined ? search      : searchValueRef.current;
    const c = category    !== undefined ? category    : selectedCategoryRef.current;
    const b = batch       !== undefined ? batch       : batchSearchRef.current;
    const d = expiryDays  !== undefined ? expiryDays  : expiryDaysRef.current;

    // Build a cutoff date from "today + d days" so filtering is always relative to NOW
    const cutoff = d !== "" && !isNaN(Number(d)) && Number(d) >= 0
      ? (() => {
          const dt = new Date();
          dt.setHours(23, 59, 59, 999);          // end of today
          dt.setDate(dt.getDate() + Number(d));   // + N days
          return dt;
        })()
      : null;

    const result = productsRef.current.filter((p) => {
      const matchesSearch   = s ? p.name.toLowerCase().includes(s.toLowerCase()) : true;
      const matchesCategory = c ? (p.categoryId?._id ?? p.categoryId) === c : true;
      const matchesBatch    = b ? (p.batchNumber || "").toLowerCase().includes(b.toLowerCase()) : true;
      // When a cutoff exists: show products that HAVE an expiry date AND it falls on or before the cutoff
      const matchesExpiry   = cutoff ? (p.expiryDate && new Date(p.expiryDate) <= cutoff) : true;
      return matchesSearch && matchesCategory && matchesBatch && matchesExpiry;
    });
    setFilteredProducts(result);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    searchValueRef.current = value;
    setSearchValue(value);
    applyFilters(value, undefined, undefined, undefined);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    selectedCategoryRef.current = category;
    setSelectedCategory(category);
    applyFilters(undefined, category, undefined, undefined);
  };

  const handleBatchSearch = (value) => {
    batchSearchRef.current = value;
    setBatchSearch(value);
    applyFilters(undefined, undefined, value, undefined);
  };

  const handleExpiryDaysChange = (value) => {
    // Allow empty string (clear) or positive integers only
    if (value !== "" && (isNaN(Number(value)) || Number(value) < 0)) return;
    expiryDaysRef.current = value;
    setExpiryDaysFilter(value);
    applyFilters(undefined, undefined, undefined, value);
  };

  const clearAllFilters = () => {
    searchValueRef.current    = "";
    selectedCategoryRef.current = "";
    batchSearchRef.current    = "";
    expiryDaysRef.current     = "";
    setSearchValue("");
    setSelectedCategory("");
    setBatchSearch("");
    setExpiryDaysFilter("");
    setFilteredProducts(productsRef.current);
    setSelectedIds([]);   // clear selection when filters reset
  };

  // ── Camera / barcode scan handler ─────────────────────────────────────────
  // Uses native <input capture="environment"> — no extra library needed.
  // Modern mobile browsers decode barcodes via the OS camera app or image OCR.
  // For a proper in-browser scan, we use the BarcodeDetector API where available,
  // falling back to prompting the user to type the batch number.
  const handleScanResult = useCallback(async (file) => {
    if (!file) return;
    if (typeof window.BarcodeDetector !== "undefined") {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] });
        const bitmap   = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (barcodes.length > 0) {
          handleBatchSearch(barcodes[0].rawValue);
          toast.success(`Scanned: ${barcodes[0].rawValue}`);
        } else {
          toast.info("No barcode detected in image. Enter batch number manually.");
        }
      } catch {
        toast.error("Scan failed. Enter batch number manually.");
      }
    } else {
      toast.info("Barcode scanning not supported on this device. Enter batch number manually.");
    }
  }, []);

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = (product) => {
    setPendingEdit(product);
    setShowChooser(true);
  };

  // ── Open modal edit (after chooser selects modal) ─────────────────────────
  const openModalEdit = (product) => {
    setEditProduct(product._id);
    setFormData({
      name:           product.name,
      description:    product.description,
      price:          product.price,
      wholesalePrice: product.wholesalePrice ?? "",
      stock:          product.stock,
      categoryId:     product.categoryId?._id || "",
      supplierId:     product.supplierId?._id || "",
      images: Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image ? [product.image] : [],
      image:       product.image || "",
      removeImage: false,
      batchNumber: product.batchNumber || "",
      expiryDate:  product.expiryDate
        ? new Date(product.expiryDate).toISOString().slice(0, 10)
        : "",
      isNewArrival: product.isNewArrival || false,
      isBonanza:    product.isBonanza    || false,
      isStaffOnly:  product.isStaffOnly  || false,
      individualLowStockThreshold:    product.individualLowStockThreshold ?? "",
      individualLowStockAlertEnabled: product.individualLowStockAlertEnabled !== false,
      variants: Array.isArray(product.variants) ? product.variants : [],
    });
    setOpenModal(true);
  };

  // ── Optimistic delete ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const previousProducts = products;
    const previousFiltered = filteredProducts;
    const next = products.filter((p) => p._id !== id);
    productsRef.current = next;
    setProducts(next);
    setFilteredProducts((prev) => prev.filter((p) => p._id !== id));
    try {
      const response = await axiosInstance.delete(`/products/${id}`);
      if (response.data.success) {
        toast.success("Product deleted successfully!");
      } else {
        productsRef.current = previousProducts;
        setProducts(previousProducts);
        setFilteredProducts(previousFiltered);
        toast.error("Error deleting product.");
      }
    } catch {
      productsRef.current = previousProducts;
      setProducts(previousProducts);
      setFilteredProducts(previousFiltered);
      toast.error("Error deleting product. Please try again");
    }
  };

  // ── Submit (add or edit) ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    const isEditing      = Boolean(editProduct);
    const targetId       = editProduct;
    const savedScrollTop = scrollRef.current?.scrollTop || 0;

    try {
      const data = new FormData();

      // Append all non-image text fields
      Object.keys(formData).forEach((key) => {
        if (["image", "removeImage", "_imageName", "images", "variants"].includes(key)) return;
        data.append(key, formData[key] === "" ? "" : formData[key]);
      });

      // Serialize variants as JSON string
      if (Array.isArray(formData.variants) && formData.variants.length > 0) {
        data.append("variants", JSON.stringify(formData.variants));
      }

      // Append each new image file under the "images" field (multer array)
      imageFiles.forEach((file) => data.append("images", file));

      // Tell the server which existing Cloudinary URLs to keep
      data.append("keepImages", JSON.stringify(keptImageUrls));

      const url = isEditing ? `/products/${targetId}` : "/products/add";
      if (isEditing) setUpdatingProductId(targetId);

      const response = await axiosInstance({
        method:  isEditing ? "put" : "post",
        url,
        data,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        closeModal();
        toast.success(isEditing ? "Product updated successfully!" : "Product added successfully!");

        if (isEditing) {
          const refreshed = await axiosInstance.get("/products");
          if (refreshed.data.success) {
            const updatedProduct = refreshed.data.products.find((p) => p._id === targetId);
            if (updatedProduct) {
              const newProducts = products.map((p) => p._id === targetId ? updatedProduct : p);
              productsRef.current = newProducts;
              setProducts(newProducts);
              applyFilters(searchValueRef.current, selectedCategoryRef.current, batchSearchRef.current, expiryDaysRef.current);
            }
          }
        } else {
          fetchProducts();
        }
      } else {
        toast.error("Something went wrong. Try again.");
        if (isEditing) fetchProducts();
      }
    } catch (error) {
      toast.error(parseApiError(error));
      if (isEditing) fetchProducts();
    } finally {
      setUpdatingProductId(null);
      if (isEditing && scrollRef.current) {
        try {
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = savedScrollTop;
          });
        } catch { /* ignore */ }
      }
    }
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditProduct(null);
    setImageFiles([]);
    setKeptImageUrls([]);
    setFormData(EMPTY_FORM);
  };

  // ── Deleted products ──────────────────────────────────────────────────────
  const fetchDeletedProducts = async () => {
    setLoadingDeleted(true);
    try {
      const res = await axiosInstance.get("/products/deleted");
      if (res.data.success) setDeletedProducts(res.data.products);
    } catch { toast.error("Failed to fetch deleted products"); }
    finally { setLoadingDeleted(false); }
  };

  const handleToggleNewArrival = useCallback(async (productId, currentValue) => {
    // Optimistic update
    const update = (list) => list.map((p) =>
      p._id === productId
        ? { ...p, isNewArrival: !currentValue, newArrivalAt: !currentValue ? new Date().toISOString() : null }
        : p
    );
    productsRef.current = update(productsRef.current);
    setProducts((prev) => update(prev));
    setFilteredProducts((prev) => update(prev));

    try {
      const res = await axiosInstance.patch(`/products/${productId}/new-arrival`);
      if (res.data.success) {
        toast.success(res.data.message || "Updated");
      } else {
        fetchProducts();
        toast.error("Failed to update new arrival status");
      }
    } catch {
      fetchProducts();
      toast.error("Failed to update new arrival status");
    }
  }, [fetchProducts]);

  const handleToggleBonanza = useCallback(async (productId, currentValue) => {
    const update = (list) => list.map((p) =>
      p._id === productId ? { ...p, isBonanza: !currentValue } : p
    );
    productsRef.current = update(productsRef.current);
    setProducts((prev) => update(prev));
    setFilteredProducts((prev) => update(prev));
    try {
      const res = await axiosInstance.patch(`/products/${productId}/bonanza`);
      if (res.data.success) {
        toast.success(res.data.message || "Updated");
      } else { fetchProducts(); toast.error("Failed to update bonanza status"); }
    } catch { fetchProducts(); toast.error("Failed to update bonanza status"); }
  }, [fetchProducts]);

  const handleToggleStaffOnly = useCallback(async (productId, currentValue) => {
    const update = (list) => list.map((p) =>
      p._id === productId ? { ...p, isStaffOnly: !currentValue } : p
    );
    productsRef.current = update(productsRef.current);
    setProducts((prev) => update(prev));
    setFilteredProducts((prev) => update(prev));
    try {
      const res = await axiosInstance.patch(`/products/${productId}/staff-only`);
      if (res.data.success) {
        toast.success(res.data.message || "Updated");
      } else { fetchProducts(); toast.error("Failed to update staff-only status"); }
    } catch { fetchProducts(); toast.error("Failed to update staff-only status"); }
  }, [fetchProducts]);

  const handleSetLowStockConfig = useCallback(async (productId, threshold, enabled) => {
    // threshold: number|null — null means clear individual setting
    // enabled: boolean
    const update = (list) => list.map((p) =>
      p._id === productId
        ? { ...p, individualLowStockThreshold: threshold, individualLowStockAlertEnabled: enabled }
        : p
    );
    productsRef.current = update(productsRef.current);
    setProducts((prev) => update(prev));
    setFilteredProducts((prev) => update(prev));
    try {
      const res = await axiosInstance.patch(`/products/${productId}/low-stock-config`, {
        threshold: threshold === "" ? null : threshold,
        enabled,
      });
      if (res.data.success) {
        toast.success("Low stock alert updated");
      } else { fetchProducts(); toast.error("Failed to update low stock config"); }
    } catch { fetchProducts(); toast.error("Failed to update low stock config"); }
  }, [fetchProducts]);

  const handleViewDeleted = () => { fetchDeletedProducts(); setShowDeletedPopup(true); };

  // ── Duplicate product ─────────────────────────────────────────────────────
  const handleDuplicate = useCallback(async (productId) => {
    if (!confirm("Duplicate this product? A copy will be created with 0 stock. You can then edit it.")) return;
    try {
      const res = await axiosInstance.post(`/products/${productId}/duplicate`);
      if (res.data.success) {
        toast.success("Product duplicated! Edit the copy to set its stock.");
        fetchProducts();
      } else { toast.error("Failed to duplicate product"); }
    } catch { toast.error("Failed to duplicate product"); }
  }, [fetchProducts]);

  const handleRestore = async (id) => {
    try {
      const response = await axiosInstance.put(`/products/restore/${id}`);
      if (response.data.success) {
        toast.success("Product restored!");
        fetchProducts();
        fetchDeletedProducts();
      }
    } catch { toast.error("Failed to restore product"); }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
      const response = await axiosInstance.delete(`/products/permanent/${id}`);
      if (response.data.success) {
        toast.success("Product permanently deleted!");
        fetchDeletedProducts();
      }
    } catch { toast.error("Failed to delete product permanently"); }
  };

  const handleBulkPermanentDelete = async (ids) => {
    try {
      await axiosInstance.post("/products/batch/permanent-delete", { ids });
      toast.success(`${ids.length} product(s) permanently deleted`);
      fetchDeletedProducts();
    } catch { toast.error("Bulk permanent delete failed"); }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold mb-2">Product Management</h1>

      {/* ── Filter bar — responsive, no hidden scroll ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col gap-2"
        style={{ position: "sticky", top: 0, zIndex: 20 }}>

        {/* Row 1: Search + Category — wrap on mobile, single line on desktop */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Name search — expands on desktop */}
          <div className="relative flex-1 min-w-[140px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchValue}
              onChange={handleSearch}
              className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-[130px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>

          {/* Batch number text search */}
          <div className="relative flex-1 min-w-[140px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Batch number..."
              value={batchSearch}
              onChange={(e) => handleBatchSearch(e.target.value)}
              className="border border-gray-300 rounded-md pl-7 pr-8 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            <label title="Scan barcode" className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-purple-600 transition">
              <ScanLine size={14} />
              <input ref={batchScanInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => handleScanResult(e.target.files?.[0])} />
            </label>
          </div>

          {/* Expiry days filter */}
          <div className="relative flex-1 min-w-[130px]">
            <CalendarClock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="number" min="0" max="3650"
              placeholder="Expiring in... days"
              value={expiryDaysFilter}
              onChange={(e) => handleExpiryDaysChange(e.target.value)}
              onWheel={e => e.preventDefault()}
              className="border border-gray-300 rounded-md pl-7 pr-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
            />
          </div>
        </div>

        {/* Row 2: Day presets + clear — scrollable on mobile with visible hint */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}>
          {[7, 14, 30, 60, 90].map((d) => (
            <button key={d}
              onClick={() => handleExpiryDaysChange(expiryDaysFilter === String(d) ? "" : String(d))}
              className={`flex-shrink-0 px-2 py-1.5 rounded-md text-xs font-medium border transition whitespace-nowrap
                ${expiryDaysFilter === String(d)
                  ? "bg-orange-500 text-white border-orange-500"
                  : "border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700"}`}
            >{d}d</button>
          ))}

          {/* Clear all filters */}
          {(searchValue || selectedCategory || batchSearch || expiryDaysFilter) && (
            <button onClick={clearAllFilters}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 whitespace-nowrap transition">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {(batchSearch || expiryDaysFilter) && (
          <div className="flex flex-wrap gap-1.5">
            {batchSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                <ScanLine size={10} /> Batch: <strong>{batchSearch}</strong>
                <button onClick={() => handleBatchSearch("")} className="ml-1 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {expiryDaysFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                <CalendarClock size={10} /> Expiring in <strong>{expiryDaysFilter}d</strong>
                <button onClick={() => handleExpiryDaysChange("")} className="ml-1 hover:text-orange-900"><X size={10} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        {/* ── Bulk action bar — shown when items are selected ── */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <span className="text-sm font-semibold text-indigo-700">
              {selectedIds.length} selected
            </span>
            <div className="flex flex-wrap gap-2 ml-2">
              <button onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition border border-red-200">
                <Trash2 size={12} /> Delete
              </button>
              <button onClick={() => handleBulkFlag("isNewArrival", true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition border border-indigo-200">
                ✨ New Arrival ON
              </button>
              <button onClick={() => handleBulkFlag("isNewArrival", false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition border border-gray-200">
                ✨ OFF
              </button>
              <button onClick={() => handleBulkFlag("isBonanza", true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 transition border border-orange-200">
                🎉 Bonanza ON
              </button>
              <button onClick={() => handleBulkFlag("isBonanza", false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition border border-gray-200">
                🎉 OFF
              </button>
              <button onClick={() => handleBulkFlag("isStaffOnly", true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition border border-red-200">
                🔒 Staff-Only ON
              </button>
              <button onClick={() => handleBulkFlag("isStaffOnly", false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition border border-gray-200">
                🔒 OFF
              </button>
            </div>
            <button onClick={clearSelection}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition border border-gray-200">
              <X size={12} /> Clear
            </button>
          </div>
        )}

        {loading ? (
          <ProductSkeleton />
        ) : (
          <ProductTable
            products={filteredProducts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddClick={() => { setPendingEdit(null); setShowChooser(true); }}
            onViewDeleted={handleViewDeleted}
            onDuplicate={handleDuplicate}
            updatingProductId={updatingProductId}
            scrollRef={scrollRef}
            lowStockThreshold={lowStockThreshold}
            onToggleNewArrival={handleToggleNewArrival}
            onToggleBonanza={handleToggleBonanza}
            onToggleStaffOnly={handleToggleStaffOnly}
            onSetLowStockConfig={handleSetLowStockConfig}
            batchSearch={batchSearch}
            expiryDateFilter={expiryDaysFilter}
            selectedIds={selectedIds}
            onSelectId={handleSelectId}
            onSelectPage={handleSelectPage}
          />
        )}
      </div>

      {openModal && (
        <ProductForm
          open={openModal}
          editProduct={editProduct}
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          onClose={closeModal}
          imageFiles={imageFiles}
          setImageFiles={setImageFiles}
          keptImageUrls={keptImageUrls}
          setKeptImageUrls={setKeptImageUrls}
        />
      )}

      <DeletedProductsPopup
        open={showDeletedPopup}
        onClose={() => setShowDeletedPopup(false)}
        products={deletedProducts}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onBulkPermanentDelete={handleBulkPermanentDelete}
        fetchDeletedProducts={fetchDeletedProducts}
        loading={loadingDeleted}
      />

      {/* ── Mode chooser modal ─────────────────────────────────────────── */}
      {showChooser && (
        <ModeChooserModal
          isEditing={Boolean(pendingEdit)}
          onClose={() => { setShowChooser(false); setPendingEdit(null); }}
          onModal={() => {
            setShowChooser(false);
            if (pendingEdit) {
              openModalEdit(pendingEdit);
            } else {
              setOpenModal(true);
            }
            setPendingEdit(null);
          }}
          onFullPage={() => {
            setShowChooser(false);
            // Save scroll position so we can restore it on back navigation
            const scroller = document.getElementById("main-scroll");
            if (scroller) {
              sessionStorage.setItem(
                "melech_scroll_pos_/admin-dashboard/products",
                String(scroller.scrollTop)
              );
            }
            if (pendingEdit) {
              navigate(`/admin-dashboard/edit-product/${pendingEdit._id}`);
            } else {
              navigate("/admin-dashboard/add-product");
            }
            setPendingEdit(null);
          }}
        />
      )}
    </div>
  );
};

export default Product;
