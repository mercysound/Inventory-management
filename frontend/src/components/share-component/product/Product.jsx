import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import ProductTable from "./ProductTable";
import ProductForm from "./ProductForm";
import ProductSkeleton from "./ProductSkeleton";
import axiosInstance from "../../../utils/axiosInstance";
import DeletedProductsPopup from "./DeletedProductsPopup";

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
};

const Product = () => {
  const [openModal,         setOpenModal]         = useState(false);
  const [editProduct,       setEditProduct]       = useState(null);
  const [categories,        setCategories]        = useState([]);
  const [suppliers,         setSuppliers]         = useState([]);
  const [products,          setProducts]          = useState([]);
  const [filteredProducts,  setFilteredProducts]  = useState([]);
  const [selectedCategory,  setSelectedCategory]  = useState("");
  const [searchValue,       setSearchValue]       = useState("");
  const productsRef         = useRef([]);
  const selectedCategoryRef = useRef("");
  const searchValueRef      = useRef("");
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

  // ── Fetch all products ────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
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
        const currentCat    = selectedCategoryRef.current;
        const currentSearch = searchValueRef.current;
        setFilteredProducts(
          newProducts.filter((p) => {
            const matchesSearch   = currentSearch
              ? p.name.toLowerCase().includes(currentSearch.toLowerCase())
              : true;
            const matchesCategory = currentCat
              ? (p.categoryId?._id ?? p.categoryId) === currentCat
              : true;
            return matchesSearch && matchesCategory;
          })
        );
      } else {
        toast.error("Error fetching products. Please try again");
      }
      // Update the low stock threshold from settings
      const threshold = settingsRes?.data?.settings?.lowStockThreshold;
      if (threshold !== undefined) setLowStockThreshold(threshold);
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
  const applyFilters = (search, category) => {
    const s = search   !== undefined ? search   : searchValueRef.current;
    const c = category !== undefined ? category : selectedCategoryRef.current;

    const result = productsRef.current.filter((p) => {
      const matchesSearch   = s ? p.name.toLowerCase().includes(s.toLowerCase()) : true;
      // c === "" means "All Categories" — show everything
      const matchesCategory = c ? (p.categoryId?._id ?? p.categoryId) === c : true;
      return matchesSearch && matchesCategory;
    });
    setFilteredProducts(result);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    searchValueRef.current = value;
    setSearchValue(value);
    applyFilters(value, selectedCategoryRef.current);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;   // "" = All Categories
    selectedCategoryRef.current = category;
    setSelectedCategory(category);
    applyFilters(searchValueRef.current, category);
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = (product) => {
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
        if (["image", "removeImage", "_imageName", "images"].includes(key)) return;
        data.append(key, formData[key] === "" ? "" : formData[key]);
      });

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
              applyFilters(searchValueRef.current, selectedCategoryRef.current);
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
        // Rollback
        fetchProducts();
        toast.error("Failed to update new arrival status");
      }
    } catch {
      fetchProducts();
      toast.error("Failed to update new arrival status");
    }
  }, [fetchProducts]);

  const handleViewDeleted = () => { fetchDeletedProducts(); setShowDeletedPopup(true); };

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

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold mb-2">Product Management</h1>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <input
          type="text"
          placeholder="Search product..."
          value={searchValue}
          onChange={handleSearch}
          className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedCategory}
          onChange={handleCategoryChange}
          className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        {loading ? (
          <ProductSkeleton />
        ) : (
          <ProductTable
            products={filteredProducts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddClick={() => setOpenModal(true)}
            onViewDeleted={handleViewDeleted}
            updatingProductId={updatingProductId}
            scrollRef={scrollRef}
            lowStockThreshold={lowStockThreshold}
            onToggleNewArrival={handleToggleNewArrival}
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
        fetchDeletedProducts={fetchDeletedProducts}
        loading={loadingDeleted}
      />
    </div>
  );
};

export default Product;
