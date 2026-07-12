// src/pages/admin/AddProductPage.jsx
// Full-page add/edit product form at:
//   /admin-dashboard/add-product
//   /admin-dashboard/edit-product/:id
// Reuses all the same ProductForm internals but in a routed page instead of a modal.

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Loader2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import ProductForm from "../../components/share-component/product/ProductForm";

const EMPTY_FORM = {
  name: "", description: "", price: "", wholesalePrice: "",
  stock: "", categoryId: "", supplierId: "",
  images: [], image: "", removeImage: false,
  batchNumber: "", expiryDate: "",
  isNewArrival: false, isBonanza: false, isStaffOnly: false,
  individualLowStockThreshold: "",
  individualLowStockAlertEnabled: true,
  variants: [],
};

const AddProductPage = () => {
  const navigate    = useNavigate();
  const { id }      = useParams();         // undefined when adding
  const isEditing   = Boolean(id);

  const [formData,      setFormData]      = useState(EMPTY_FORM);
  const [categories,    setCategories]    = useState([]);
  const [suppliers,     setSuppliers]     = useState([]);
  const [imageFiles,    setImageFiles]    = useState([]);
  const [keptImageUrls, setKeptImageUrls] = useState([]);
  const [loadingInit,   setLoadingInit]   = useState(true);

  // ── Load categories, suppliers + optionally existing product ─────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [prodRes] = await Promise.all([
          axiosInstance.get("/products"),
        ]);
        if (prodRes.data.success) {
          setCategories(prodRes.data.categories || []);
          setSuppliers(prodRes.data.suppliers || []);
          if (isEditing) {
            const product = prodRes.data.products.find(p => p._id === id);
            if (product) {
              setFormData({
                name:           product.name,
                description:    product.description,
                price:          product.price,
                wholesalePrice: product.wholesalePrice ?? "",
                stock:          product.stock,
                categoryId:     product.categoryId?._id || "",
                supplierId:     product.supplierId?._id || "",
                images: Array.isArray(product.images) && product.images.length > 0
                  ? product.images : product.image ? [product.image] : [],
                image:       product.image || "",
                removeImage: false,
                batchNumber: product.batchNumber || "",
                expiryDate:  product.expiryDate
                  ? new Date(product.expiryDate).toISOString().slice(0, 10) : "",
                isNewArrival: product.isNewArrival || false,
                isBonanza:    product.isBonanza    || false,
                isStaffOnly:  product.isStaffOnly  || false,
                individualLowStockThreshold:    product.individualLowStockThreshold ?? "",
                individualLowStockAlertEnabled: product.individualLowStockAlertEnabled !== false,
                variants: Array.isArray(product.variants) ? product.variants : [],
              });
              setKeptImageUrls(
                Array.isArray(product.images) && product.images.length > 0
                  ? product.images
                  : product.image ? [product.image] : []
              );
            } else {
              toast.error("Product not found");
              navigate("/admin-dashboard/products");
            }
          }
        }
      } catch {
        toast.error("Failed to load product data");
      } finally {
        setLoadingInit(false);
      }
    };
    init();
  }, [id, isEditing, navigate]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (["image", "removeImage", "_imageName", "images", "variants"].includes(key)) return;
      data.append(key, formData[key] === "" ? "" : formData[key]);
    });
    if (Array.isArray(formData.variants) && formData.variants.length > 0) {
      data.append("variants", JSON.stringify(formData.variants));
    }
    imageFiles.forEach(file => data.append("images", file));
    data.append("keepImages", JSON.stringify(keptImageUrls));

    const url    = isEditing ? `/products/${id}` : "/products/add";
    const method = isEditing ? "put" : "post";

    const res = await axiosInstance({ method, url, data, headers: { "Content-Type": "multipart/form-data" } });
    if (res.data.success) {
      toast.success(isEditing ? "Product updated!" : "Product added!");
      navigate("/admin-dashboard/products");
    } else {
      throw new Error(res.data.message || "Something went wrong");
    }
  }, [formData, imageFiles, keptImageUrls, id, isEditing, navigate]);

  if (loadingInit) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Loader2 size={28} className="animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="bg-gray-50 pb-16">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3
        flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-600 font-medium transition">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-base font-bold text-gray-900">
          {isEditing ? "Edit Product (Full Page)" : "Add Product (Full Page)"}
        </h1>
      </div>

      {/* Form content — scrolls naturally inside #main-scroll */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ProductForm
          open={true}
          editProduct={isEditing ? id : null}
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          onClose={() => navigate(-1)}
          imageFiles={imageFiles}
          setImageFiles={setImageFiles}
          keptImageUrls={keptImageUrls}
          setKeptImageUrls={setKeptImageUrls}
          inlinePage={true}
        />
      </div>
    </div>
  );
};

export default AddProductPage;
