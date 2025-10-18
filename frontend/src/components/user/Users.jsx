import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import UsersForm from "./UsersForm";
import UsersTable from "./UsersTable";
import UsersSkeleton from "./UsersSkeleton";

const Users = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    role: "",
  });
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        },
      });
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
      const response = await axiosInstance.post("/users/add", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        },
      });

      if (response.data.success) {
        toast.success("User added successfully!");
        setFormData({
          name: "",
          email: "",
          password: "",
          address: "",
          role: "",
        });
        fetchUsers();
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          toast.error(error.response.data.message || "User already exists");
        } else {
          toast.error(error.response.data.message || "Error adding user");
        }
      } else {
        toast.error("Network error – please try again");
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );
    if (!confirmDelete) return;

    try {
      const response = await axiosInstance.delete(`/users/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        },
      });
      if (response.data.success) {
        toast.success("User deleted successfully!");
        fetchUsers();
      } else {
        toast.error("Error deleting user. Please try again");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error deleting user. Please try again");
    }
  };

  const handleSearch = (e) => {
    setFilteredUsers(
      users.filter((user) =>
        user.name.toLowerCase().includes(e.target.value.toLowerCase())
      )
    );
  };

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-8">Users Management</h1>
      {loading ? (
        <UsersSkeleton />
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-1/3">
            <UsersForm
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
            />
          </div>
          <div className="lg:w-2/3">
            <input
              type="text"
              placeholder="Search user"
              className="p-2 bg-white w-full mb-4 rounded"
              onChange={handleSearch}
            />
            <UsersTable
              users={filteredUsers}
              handleDelete={handleDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
