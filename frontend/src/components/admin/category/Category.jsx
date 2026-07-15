import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";
import { FolderPlus } from "lucide-react";
import CategoryForm from "./CategoryForm";
import CategoryTable from "./CategoryTable";
import CategorySkeleton from "./CategorySkeleton";
import axiosInstance from "../../../utils/axiosInstance";

const Category = () => {
  const [categoryName,        setCategoryName]        = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categories,          setCategories]          = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [saving,              setSaving]              = useState(false);
  const [editCategory,        setEditCategory]        = useState(null);
  const [modalOpen,           setModalOpen]           = useState(false);
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/category`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
      if (error.response?.status === 401) {
        if (error.response.data.message?.includes("Token has expired")) {
          localStorage.removeItem("pos-token");
          toast.error("Session expired. Please login again.");
          navigate("/login");
        }
      } else {
        toast.error("Failed to load categories");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAddModal = () => {
    setEditCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditCategory(category._id);
    setCategoryName(category.name);
    setCategoryDescription(category.description);
    setModalOpen(true);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setEditCategory(null);
    setCategoryName("");
    setCategoryDescription("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let response;
      if (editCategory) {
        response = await axiosInstance.put(`/category/${editCategory}`, {
          categoryName,
          categoryDescription,
        });
      } else {
        response = await axiosInstance.post(`/category/add`, {
          categoryName,
          categoryDescription,
        });
      }

      if (response.data.success) {
        toast.success(editCategory ? "Category updated!" : "Category added!");
        handleCancel();
        fetchCategories();
      } else {
        toast.error("Operation failed, please try again.");
      }
    } catch (error) {
      console.error("Category request error:", error);
      toast.error("Something went wrong, please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      const response = await axiosInstance.delete(`/category/${id}`);
      if (response.data.success) {
        toast.success("Category deleted successfully!");
        fetchCategories();
      } else {
        toast.error("Error deleting category. Please try again.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting category.");
    }
  };

  if (loading) return <CategorySkeleton />;

  return (
    <div className="py-6 px-4 md:px-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            📂 Category Management
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700
            text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
        >
          <FolderPlus size={16} />
          Add Category
        </button>
      </div>

      {/* ── Table ── */}
      <CategoryTable
        categories={categories}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* ── Modal ── */}
      <CategoryForm
        open={modalOpen}
        categoryName={categoryName}
        categoryDescription={categoryDescription}
        editCategory={editCategory}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onChangeName={(e) => setCategoryName(e.target.value)}
        onChangeDescription={(e) => setCategoryDescription(e.target.value)}
        loading={saving}
      />
    </div>
  );
};

export default Category;
