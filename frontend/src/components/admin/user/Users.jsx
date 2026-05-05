import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import UsersForm from "./UsersForm";
import UsersTable from "./UsersTable";
import UsersSkeleton from "./UsersSkeleton";
import axiosInstance from "../../../utils/axiosInstance";

const Users = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    role: "",
  });

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/users");
      setUsers(response.data.users);
      setFilteredUsers(response.data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post("/users/add", formData);

      if (response.data.success) {
        toast.success("User added successfully!");
        setFormData({
          name: "",
          email: "",
          password: "",
          phone: "",
          address: "",
          role: "",
        });
        fetchUsers();
      }
    } catch (error) {
      const res = error.response?.data;

      console.log("FULL ERROR:", res);

      if (res?.errors && res.errors.length > 0) {
        // Show first validation error
        toast.error(res.errors[0].message);
      } else {
        toast.error(res?.message || "Error adding user");
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      const res = await axiosInstance.delete(`/users/${id}`);
      if (res.data.success) {
        toast.success("User deleted successfully");
        fetchUsers();
      } else {
        toast.error("Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Error deleting user. Please try again.");
    }
  };

  const handleSearch = (e) => {
    setFilteredUsers(
      users.filter((u) =>
        u.name.toLowerCase().includes(e.target.value.toLowerCase())
      )
    );
  };

  return (
    <div className="py-4 px-4 md:px-0">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Users Management</h1>

      {loading ? (
        <UsersSkeleton />
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 lg:h-[85vh]">
          {/* LEFT - SCROLLABLE FORM */}
          <div className="lg:w-1/3 bg-white rounded-xl shadow-md p-4 overflow-y-auto">
            <UsersForm
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
            />
          </div>

          {/* RIGHT - SCROLLABLE TABLE */}
          <div className="lg:w-2/3 bg-white rounded-xl shadow-md p-4 overflow-y-auto">
            <input
              type="text"
              placeholder="Search user..."
              className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleSearch}
            />

            <UsersTable users={filteredUsers} handleDelete={handleDelete} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
