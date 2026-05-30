import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import SupplierTable from "./SupplierTable";
import SupplierForm from "./SupplierForm";
import SupplierSkeleton from "./SupplierSkeleton";
import { FaUserPlus, FaSearch } from "react-icons/fa";
import { AlertTriangle, Phone, Mail } from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";
import { parseApiError } from "../../../../../server/utils/parseApiError";
import ConfirmDialog from "../../share-component/ConfirmDialog";


const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filterSupplier, setFilterSupplier] = useState([]);
  const [editSupplier, setEditSupplier] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingSupplierId, setUpdatingSupplierId] = useState(null); // ✅ tracks which row
  const [submittingModal, setSubmittingModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const emptyForm = {
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    notes: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  // Suppliers.jsx
const fetchSuppliers = async (attempt = 1) => {
  try {
    if (attempt === 1) setLoading(true);
    const response = await axiosInstance.get("/supplier");
    setSuppliers(response.data.suppliers);
    setFilterSupplier(response.data.suppliers);
    setLoading(false);
  } catch (err) {
    const isTimeout = err.code === "ECONNABORTED" || err.message?.includes("timeout");
    if (isTimeout && attempt === 1) {
      console.warn("Suppliers timeout — retrying in 3s...");
      setTimeout(() => fetchSuppliers(2), 3000);
      return;
    }
    toast.error("Failed to load suppliers");
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
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactPerson: supplier.contactPerson || "",
      notes: supplier.notes || "",
    });
    setEditSupplier(supplier._id);
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditSupplier(null);
    setFormData(emptyForm);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  const isEditing = Boolean(editSupplier);
  const targetId = editSupplier;

  setSubmittingModal(true);

  // ❌ Remove closeModal() from here — don't close before we know it succeeded

  if (isEditing) {
    setUpdatingSupplierId(targetId);
  }

  try {
    let response;
    if (isEditing) {
      response = await axiosInstance.put(`/supplier/${targetId}`, formData);
    } else {
      response = await axiosInstance.post("/supplier/add", formData);
    }

    if (response.data.success) {
      closeModal(); // ✅ Only close on success
      toast.success(isEditing ? "Supplier updated!" : "Supplier added!");

      if (isEditing) {
        const refreshed = await axiosInstance.get("/supplier");
        if (refreshed.data.success) {
          const updatedSupplier = refreshed.data.suppliers.find(
            (s) => s._id === targetId
          );
          if (updatedSupplier) {
            setSuppliers((prev) =>
              prev.map((s) => (s._id === targetId ? updatedSupplier : s))
            );
            setFilterSupplier((prev) =>
              prev.map((s) => (s._id === targetId ? updatedSupplier : s))
            );
          }
        }
      } else {
        fetchSuppliers();
      }
    } else {
      toast.error("Something went wrong. Try again.");
      if (isEditing) fetchSuppliers();
    }
  } catch (error) {
    toast.error(parseApiError(error));
  } finally {
    setUpdatingSupplierId(null);
    setSubmittingModal(false);
  }
};

  // ✅ Optimistic delete — row disappears instantly
  const handleDelete = (id) => {
    setConfirmTarget(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget;
    const previousSuppliers = suppliers;
    const previousFiltered = filterSupplier;

    setDeletingId(id);
    // optimistic remove
    setSuppliers((prev) => prev.filter((s) => s._id !== id));
    setFilterSupplier((prev) => prev.filter((s) => s._id !== id));

    try {
      const response = await axiosInstance.delete(`/supplier/${id}`);
      if (response.data.success) {
        toast.success("Supplier deleted!");
      } else {
        // rollback
        setSuppliers(previousSuppliers);
        setFilterSupplier(previousFiltered);
        toast.error("Failed to delete supplier");
      }
    } catch (error) {
      // rollback
      setSuppliers(previousSuppliers);
      setFilterSupplier(previousFiltered);
      const msg = error.response?.data?.message || "Error deleting supplier";
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  const needsReorder = filterSupplier.filter(
    (s) => s.outOfStockCount > 0 || s.lowStockCount > 0
  );

  return (
    <div className="w-full h-full flex flex-col gap-5 p-4 sm:p-6">

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Supplier Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage who supplies your products — used for reordering and stock tracking
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search supplier..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
              onChange={handleSearch}
            />
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition font-medium flex-shrink-0"
            onClick={() => setOpenModal(true)}
          >
            <FaUserPlus size={13} />
            <span className="hidden sm:inline">Add supplier</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* REORDER ALERT BANNER */}
      {!loading && needsReorder.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span className="text-sm font-medium">
              {needsReorder.length} supplier{needsReorder.length !== 1 ? "s" : ""} need reordering
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {needsReorder.map((s) => (
              <div
                key={s._id}
                className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs flex-wrap"
              >
                <span className="font-medium text-gray-700">{s.name}</span>
                {s.outOfStockCount > 0 && (
                  <span className="text-red-500 font-medium">
                    {s.outOfStockCount} out of stock
                  </span>
                )}
                {s.lowStockCount > 0 && (
                  <span className="text-amber-600 font-medium">
                    {s.lowStockCount} low stock
                  </span>
                )}
                {s.phone && (
                  
                  <a  href={`tel:${s.phone}`}
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    <Phone size={10} /> Call
                  </a>
                )}
                {s.email && (
                  
                   <a href={`https://mail.google.com/mail/?view=cm&to=${s.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    <Mail size={10} /> Email
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <SupplierSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SupplierTable
            suppliers={filterSupplier}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            updatingSupplierId={updatingSupplierId} // ✅ passed down
          />
        </motion.div>
      )}

      {/* MODAL */}
      {openModal && (
        <SupplierForm
          formData={formData}
          setFormData={setFormData}
          editSupplier={editSupplier}
          handleSubmit={handleSubmit}
          submitting={submittingModal}
          closeModal={closeModal}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete supplier"
        message="This will permanently remove the supplier and associated links. Continue?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
        dangerText={deletingId ? 'Deleting...' : 'Delete'}
      />
    </div>
  );
};

export default Suppliers;