import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import SupplierTable from "./SupplierTable";
import SupplierForm from "./SupplierForm";
import SupplierSkeleton from "./SupplierSkeleton";
import { FaUserPlus, FaSearch } from "react-icons/fa";

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filterSupplier, setFilterSupplier] = useState([]);
  const [editSupplier, setEditSupplier] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    number: "",
    address: "",
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/supplier");
      setSuppliers(response.data.suppliers);
      setFilterSupplier(response.data.suppliers);
    } catch (error) {
      console.error("Error fetching suppliers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setFilterSupplier(
      suppliers.filter((s) => s.name.toLowerCase().includes(value))
    );
  };

  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      email: supplier.email,
      number: supplier.number,
      address: supplier.address,
    });
    setEditSupplier(supplier._id);
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditSupplier(null);
    setFormData({ name: "", email: "", number: "", address: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let response;
    try {
      if (editSupplier) {
        response = await axiosInstance.put(`/supplier/${editSupplier}`, formData);
      } else {
        response = await axiosInstance.post("/supplier/add", formData);
      }

      if (response.data.success) {
        toast.success(editSupplier ? "Supplier updated!" : "Supplier added!");
        fetchSuppliers();
        closeModal();
      } else {
        toast.error("Something went wrong. Try again.");
      }
    } catch (error) {
      if (error.response?.status === 400) toast.error("Supplier already exists");
      else toast.error("Something went wrong");
    }
  };

  const handleDelete = async (id) => {
    try {
      if (confirm("Are you sure you want to delete this supplier?")) {
        const response = await axiosInstance.delete(`/supplier/${id}`);
        if (response.data.success) {
          toast.success("Supplier deleted!");
          fetchSuppliers();
        } else toast.error("Failed to delete supplier");
      }
    } catch (error) {
      toast.error("Error deleting supplier");
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 p-4 sm:p-6 bg-gradient-to-b from-gray-50 to-white rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-wide">
          Supplier Management
        </h1>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search supplier..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              onChange={handleSearch}
            />
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={() => setOpenModal(true)}
          >
            <FaUserPlus /> <span className="hidden sm:inline">Add Supplier</span>
          </button>
        </div>
      </div>

      {loading ? (
        <SupplierSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <SupplierTable
            suppliers={filterSupplier}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
          />
        </motion.div>
      )}

      {openModal && (
        <SupplierForm
          formData={formData}
          setFormData={setFormData}
          editSupplier={editSupplier}
          handleSubmit={handleSubmit}
          closeModal={closeModal}
        />
      )}
    </div>
  );
};

export default Suppliers;
