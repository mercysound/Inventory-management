import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import SupplierTable from "./SupplierTable";
import SupplierForm from "./SupplierForm";
import SupplierSkeleton from "./SupplierSkeleton";

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
    <div className="w-full h-full flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Supplier Management</h1>

      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search"
          className="border p-1 bg-white rounded px-4"
          onChange={handleSearch}
        />
        <button
          className="px-4 py-1.5 bg-blue-500 text-white rounded cursor-pointer"
          onClick={() => setOpenModal(true)}
        >
          Add Supplier
        </button>
      </div>

      {loading ? (
        <SupplierSkeleton />
      ) : (
        <SupplierTable
          suppliers={filterSupplier}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
        />
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
