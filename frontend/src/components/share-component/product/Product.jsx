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
  image:          "",
  removeImage:    false,
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
  const [loading,           setLoading]           = useState(false);
  const [image,             setImage]             = useState(null);
  const [showDeletedPopup,  setShowDeletedPopup]  = useState(false);
  const [deletedProducts,   setDeletedProducts]   = useState([]);
  const [loadingDeleted,    setLoadingDeleted]    = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const scrollRef = useRef(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  // ── Fetch all products ────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/products");
      if (response.data.success) {
        setCategories(response.data.categories);
        setSuppliers(response.data.suppliers);
        const newProducts = response.data.products;
        setProducts(newProducts);
        // Re-apply current filters against the fresh list — preserves what
        // the admin already selected instead of resetting to "All Categories"
        setSelectedCategory((currentCat) => {
          setSearchValue((currentSearch) => {
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
            return currentSearch; // keep search unchanged
          });
          return currentCat; // keep category unchanged
        });
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

  // ── Central filter — always applies both search + category together ───────
  const applyFilters = (search, category, source) => {
    const base = source || products;
    const s    = search   !== undefined ? search   : searchValue;
    const c    = category !== undefined ? category : selectedCategory;

    const result = base.filter((p) => {
      const matchesSearch   = s ? p.name.toLowerCase().includes(s.toLowerCase()) : true;
      // Empty string means "All Categories" — never filter by category in that case
      const matchesCategory = c ? (p.categoryId?._id ?? p.categoryId) === c : true;
      return matchesSearch && matchesCategory;
    });
    setFilteredProducts(result);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    applyFilters(value, selectedCategory);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;       // "" means All Categories
    setSelectedCategory(category);
    applyFilters(searchValue, category);   // ✅ "" correctly resets to all
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
      image:          product.image || "",
      removeImage:    false,
    });
    setOpenModal(true);
  };

  // ── Optimistic delete ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const previousProducts = products;
    const previousFiltered = filteredProducts;
    setProducts((prev) => prev.filter((p) => p._id !== id));
    setFilteredProducts((prev) => prev.filter((p) => p._id !== id));
    try {
      const response = await axiosInstance.delete(`/products/${id}`);
      if (response.data.success) {
        toast.success("Product deleted successfully!");
      } else {
        setProducts(previousProducts);
        setFilteredProducts(previousFiltered);
        toast.error("Error deleting product.");
      }
    } catch {
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
      Object.keys(formData).forEach((key) => {
        if (key === "image" || key === "removeImage" || key === "_imageName") return;
        data.append(key, formData[key] === "" ? "" : formData[key]);
      });
      if (image)               data.append("image", image);
      if (formData.removeImage) data.append("removeImage", "true");

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
              setProducts(newProducts);
              applyFilters(searchValue, selectedCategory, newProducts);
            }
          }
        } else {
          // For add mode, ProductForm handles clearing the server draft itself
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
        requestAnimationFrame(() => { scrollRef.current.scrollTop = savedScrollTop; });
      }
    }
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditProduct(null);
    setImage(null);
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
          setImage={setImage}
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
