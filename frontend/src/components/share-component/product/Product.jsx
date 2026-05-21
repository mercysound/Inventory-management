import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import ProductTable from "./ProductTable";
import ProductForm from "./ProductForm";
import ProductSkeleton from "./ProductSkeleton";
import axiosInstance from "../../../utils/axiosInstance";
import DeletedProductsPopup from "./DeletedProductsPopup";
import { parseApiError } from "../../../../../server/utils/parseApiError";

const emptyForm = {
  name: "", description: "", price: "", stock: "",
  categoryId: "", supplierId: "", image: "", removeImage: false,
};

const Product = () => {
  const [openModal, setOpenModal]           = useState(false);
  const [editProduct, setEditProduct]       = useState(null);
  const [categories, setCategories]         = useState([]);
  const [suppliers, setSuppliers]           = useState([]);
  const [products, setProducts]             = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading]               = useState(false);
  const [image, setImage]                   = useState(null);
  const [showDeletedPopup, setShowDeletedPopup] = useState(false);
  const [deletedProducts, setDeletedProducts]   = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [formData, setFormData]             = useState(emptyForm);

  // ── draftRestored: true means we loaded a real draft from the server
  //    and pre-filled the form — show the "Draft restored" banner ──
  const [draftRestored, setDraftRestored]   = useState(false);

  const scrollRef = useRef(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/products");
      if (response.data.success) {
        setCategories(response.data.categories);
        setSuppliers(response.data.suppliers);
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
      } else {
        toast.error("Error fetching products. Please try again");
      }
    } catch (error) {
      console.error("Error fetching products", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // ─────────────────────────────────────────────────────────────────
  // LOAD DRAFT FROM SERVER when the add-product modal opens.
  // We only do this in add mode (editProduct is null).
  // If a draft exists, pre-fill the form and show the restored banner.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!openModal || editProduct) return; // only for add mode

    const loadDraft = async () => {
      try {
        const res = await axiosInstance.get("/products/draft");
        if (res.data.success && res.data.draft) {
          const d = res.data.draft;
          // Only restore if at least one field has content
          const hasSomething =
            d.name || d.description || d.price !== "" || d.stock !== "";

          if (hasSomething) {
            setFormData((prev) => ({
              ...prev,
              name:        d.name        || "",
              description: d.description || "",
              price:       d.price       ?? "",
              stock:       d.stock       ?? "",
              categoryId:  d.categoryId  || "",
              supplierId:  d.supplierId  || "",
            }));
            setDraftRestored(true); // show the amber "Draft restored" banner
          }
        }
      } catch {
        // Draft load failure is non-critical — just open a blank form
      }
    };

    loadDraft();
  }, [openModal, editProduct]);

  // ─────────────────────────────────────────────────────────────────
  // CLEAR DRAFT — called when the admin clicks "Clear draft" in the
  // banner. Wipes server-side draft and resets the form to empty.
  // ─────────────────────────────────────────────────────────────────
  const handleClearDraft = async () => {
    try {
      await axiosInstance.delete("/products/draft");
    } catch {
      // Non-critical — continue regardless
    }
    setDraftRestored(false);
    setFormData(emptyForm);
    setImage(null);
  };

  const handleSearch = (e) => {
    filterProducts(e.target.value.toLowerCase(), selectedCategory);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    filterProducts("", category);
  };

  const filterProducts = (searchValue, categoryValue) => {
    setFilteredProducts(
      products.filter((p) => {
        const matchesSearch   = p.name.toLowerCase().includes(searchValue);
        const matchesCategory = categoryValue ? p.categoryId._id === categoryValue : true;
        return matchesSearch && matchesCategory;
      })
    );
  };

  const handleEdit = (product) => {
    setEditProduct(product._id);
    setFormData({
      name:        product.name,
      description: product.description,
      price:       product.price,
      stock:       product.stock,
      categoryId:  product.categoryId?._id || "",
      supplierId:  product.supplierId?._id  || "",
      image:       product.image || "",
      removeImage: false,
    });
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    const confirmDelete = confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

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

  const handleSubmit = async () => {
    const isEditing  = Boolean(editProduct);
    const targetId   = editProduct;
    const savedScrollTop = scrollRef.current?.scrollTop || 0;

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "image" || key === "removeImage") return;
        data.append(key, formData[key]);
      });
      if (image) data.append("image", image);
      if (formData.removeImage) data.append("removeImage", "true");

      const url = isEditing ? `/products/${targetId}` : "/products/add";
      if (isEditing) setUpdatingProductId(targetId);

      const response = await axiosInstance({
        method: isEditing ? "put" : "post",
        url,
        data,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        // ── SUCCESS: if this was a new product, delete the server-side draft ──
        if (!isEditing) {
          try {
            await axiosInstance.delete("/products/draft");
          } catch {
            // Non-critical
          }
        }

        closeModal();
        toast.success(isEditing ? "Product updated successfully!" : "Product added successfully!");

        if (isEditing) {
          const refreshed = await axiosInstance.get("/products");
          if (refreshed.data.success) {
            const updated = refreshed.data.products.find((p) => p._id === targetId);
            if (updated) {
              setProducts((prev) => prev.map((p) => (p._id === targetId ? updated : p)));
              setFilteredProducts((prev) => prev.map((p) => (p._id === targetId ? updated : p)));
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
        requestAnimationFrame(() => { scrollRef.current.scrollTop = savedScrollTop; });
      }
    }
  };

  // ── closeModal does NOT delete the draft — closing ✕ or Cancel
  //    intentionally keeps the draft alive on the server so the admin
  //    can return to it from any device ──
  const closeModal = () => {
    setOpenModal(false);
    setEditProduct(null);
    setImage(null);
    setDraftRestored(false);
    setFormData(emptyForm);
  };

  const fetchDeletedProducts = async () => {
    setLoadingDeleted(true);
    try {
      const res = await axiosInstance.get("/products/deleted");
      if (res.data.success) setDeletedProducts(res.data.products);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch deleted products");
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleViewDeleted = () => {
    fetchDeletedProducts();
    setShowDeletedPopup(true);
  };

  const handleRestore = async (id) => {
    try {
      const response = await axiosInstance.put(`/products/restore/${id}`);
      if (response.data.success) {
        toast.success("Product restored!");
        fetchProducts();
        fetchDeletedProducts();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to restore product");
    }
  };

  const handlePermanentDelete = async (id) => {
    const confirmDelete = confirm("Are you sure? This cannot be undone.");
    if (!confirmDelete) return;
    try {
      const response = await axiosInstance.delete(`/products/permanent/${id}`);
      if (response.data.success) {
        toast.success("Product permanently deleted!");
        fetchDeletedProducts();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product permanently");
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold mb-2">Product Management</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <input
          type="text"
          placeholder="Search product..."
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
          draftRestored={draftRestored}      // ← tells form to show amber banner
          onClearDraft={handleClearDraft}    // ← wipes draft + resets form
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