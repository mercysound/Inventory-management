import React from "react";

const UsersForm = ({ formData, handleChange, handleSubmit }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-center text-xl font-bold mb-4">Add User</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            placeholder="Enter Name"
            className="border w-full p-2 rounded-md"
            required
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            type="email"
            placeholder="Enter Email"
            className="border w-full p-3 rounded-md"
            required
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Enter Password"
            className="border w-full p-3 rounded-md"
            required
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Enter Address"
            className="border w-full p-3 rounded-md"
            required
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>
        <div>
          <select
            name="role"
            className="border w-full p-3 rounded-md"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="">Select Role</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
          </select>
        </div>
        <div className="flex space-x-2">
          <button
            className="w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-green-600"
            type="submit"
          >
            Add User
          </button>
        </div>
      </form>
    </div>
  );
};

export default UsersForm;
