import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axiosInstance";
import ProductTable from "./ProductTable";
import ProductForm from "./ProductForm";
import ProductSkeleton from "./ProductSkeleton";

const Product = () => {
  const [openModal, setOpenModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    categoryId: "",
    supplierId: "",
  });

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    filterProducts(value, selectedCategory);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    filterProducts("", category);
  };

  const filterProducts = (searchValue, categoryValue) => {
    const filtered = products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchValue);
      const matchesCategory = categoryValue
        ? p.categoryId._id === categoryValue
        : true;
      return matchesSearch && matchesCategory;
    });
    setFilteredProducts(filtered);
  };

  const handleEdit = (product) => {
    setEditProduct(product._id);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId._id,
      supplierId: product.supplierId._id,
    });
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    const confirmDelete = confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    try {
      const response = await axiosInstance.delete(`/products/${id}`);
      if (response.data.success) {
        toast.success("Product deleted successfully!");
        fetchProducts();
      } else {
        toast.error("Error deleting product.");
      }
    } catch (error) {
      toast.error("Error deleting product. Please try again");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = editProduct
        ? await axiosInstance.put(`/products/${editProduct}`, formData)
        : await axiosInstance.post("/products/add", formData);

      if (response.data.success) {
        toast.success(editProduct ? "Product updated successfully!" : "Product added successfully!");
        closeModal();
        fetchProducts();
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Error saving product. Please try again.");
    }
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      stock: "",
      categoryId: "",
      supplierId: "",
    });
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold mb-2">Product Management</h1>

      {/* Search & Category Filter */}
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
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product Table or Skeleton */}
      <div className="mt-3">
        {loading ? (
          <ProductSkeleton />
        ) : (
          <ProductTable
            products={filteredProducts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddClick={() => setOpenModal(true)}
          />
        )}
      </div>

      {/* Product Modal Form */}
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
        />
      )}
    </div>
  );
};

export default Product;
