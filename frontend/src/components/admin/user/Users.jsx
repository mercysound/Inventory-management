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
      console.error("Error fetching users", error);
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
      toast.error(
        error.response?.data?.message || "Error adding user, please try again"
      );
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await axiosInstance.delete(`/users/${id}`);
      if (res.data.success) {
        toast.success("User deleted successfully");
        fetchUsers();
      }
    } catch (err) {
      toast.error("Error deleting user");
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
    <div className="py-4">
      <h1 className="text-3xl font-bold mb-6">Users Management</h1>

      {loading ? (
        <UsersSkeleton />
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 h-[85vh]">
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
              placeholder="Search user"
              className="w-full p-2 border rounded-lg mb-4"
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
