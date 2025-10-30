import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import CategoryForm from "./CategoryForm";
import CategoryTable from "./CategoryTable";
import CategorySkeleton from "./CategorySkeleton";
import { motion } from "framer-motion";

const Category = () => {
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCategory, setEditCategory] = useState(null);
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/category`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Error fetching categories", error);
      if (error.response?.status === 401) {
        if (error.response.data.message.includes("Token has expired")) {
          localStorage.removeItem("pos-token");
          navigate("/login");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        toast.success(
          editCategory ? "Category Updated Successfully!" : "Category Added Successfully!"
        );
        setCategoryName("");
        setCategoryDescription("");
        setEditCategory(null);
        fetchCategories();
      } else {
        toast.error("Operation failed, please try again.");
      }
    } catch (error) {
      console.error("Category request error:", error);
      toast.error("Something went wrong, please try again.");
    }
  };

  const handleEdit = (category) => {
    setEditCategory(category._id);
    setCategoryName(category.name);
    setCategoryDescription(category.description);
  };

  const handleCancel = () => {
    setEditCategory(null);
    setCategoryName("");
    setCategoryDescription("");
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this category?");
    if (!confirmDelete) return;

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
    <motion.div
      className="p-4 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Category Management
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">
        <CategoryForm
          categoryName={categoryName}
          categoryDescription={categoryDescription}
          editCategory={editCategory}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onChangeName={(e) => setCategoryName(e.target.value)}
          onChangeDescription={(e) => setCategoryDescription(e.target.value)}
        />
        <CategoryTable
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </motion.div>
  );
};

export default Category;
  