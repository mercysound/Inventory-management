import React from "react";

const SupplierForm = ({
  formData,
  setFormData,
  editSupplier,
  handleSubmit,
  closeModal,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center">
      <div className="bg-white p-4 rounded shadow-md w-1/3 relative">
        <h1 className="text-xl font-bold text-lg">
          {editSupplier ? "Edit Supplier" : "Add Supplier"}
        </h1>
        <button
          className="absolute top-4 right-4 font-bold text-lg cursor-pointer"
          onClick={closeModal}
        >
          X
        </button>
        <form className="flex flex-col gap-4 mt-4" onSubmit={handleSubmit}>
          <input
            required
            type="text"
            placeholder="Supplier Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border p-1 bg-white rounded px-4"
          />
          <input
            required
            type="email"
            placeholder="Supplier Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="border p-1 bg-white rounded px-4"
          />
          <input
            required
            type="number"
            placeholder="Supplier Phone Number"
            name="number"
            value={formData.number}
            onChange={handleChange}
            className="border p-1 bg-white rounded px-4"
          />
          <input
            required
            type="text"
            placeholder="Supplier Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="border p-1 bg-white rounded px-4"
          />

          <div className="flex space-x-2">
            <button
              className="w-full mt-2 rounded-md bg-green-500 text-white p-3 hover:bg-green-600"
              type="submit"
            >
              {editSupplier ? "Save Changes" : "Add Supplier"}
            </button>
            <button
              type="button"
              className="w-full mt-2 rounded-md bg-red-500 text-white p-3 hover:bg-red-600"
              onClick={closeModal}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierForm;
