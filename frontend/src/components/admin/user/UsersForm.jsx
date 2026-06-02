import React from "react";
import LoadingButton from "../../share-component/LoadingButton";

const UsersForm = ({ formData, handleChange, handleSubmit, submitting }) => {
  return (
    <div>
      <h2 className="text-lg md:text-xl font-semibold mb-4 text-slate-100">Add New User</h2>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          name="name"
          type="text"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="input-field"
          required
        />

        <input
          name="email"
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          className="input-field"
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="input-field"
          required
        />

        <input
          name="phone"
          type="tel"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          className="input-field"
        />

        <input
          name="address"
          type="text"
          placeholder="Home Address"
          value={formData.address}
          onChange={handleChange}
          className="input-field"
        />

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="input-field"
          required
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>

        <LoadingButton
          type="submit"
          loading={!!submitting}
          className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Save User
        </LoadingButton>
      </form>
    </div>
  );
};

export default UsersForm;
