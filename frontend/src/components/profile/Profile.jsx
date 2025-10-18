import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axiosInstance";
import ProfileForm from "./ProfileForm";
import ProfileSkeleton from "./ProfileSkeleton";

const Profile = () => {
  const [user, setUser] = useState({
    name: "",
    email: "",
    address: "",
    password: "",
  });
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Corrected endpoint
  const fetchUser = async () => {
    try {
      const response = await axiosInstance.get("/users/profile");
      if (response.data.success) {
        setUser({
          name: response.data.user.name,
          email: response.data.user.email,
          address: response.data.user.address,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Error fetching user profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // ✅ Corrected update endpoint too
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.put("/users/profile", user);
      if (response.data.success) {
        toast.success("Profile updated successfully");
        setEdit(false);
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile. Please try again.");
    }
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="p-5">
      <ProfileForm
        user={user}
        setUser={setUser}
        edit={edit}
        setEdit={setEdit}
        handleSubmit={handleSubmit}
      />
    </div>
  );
};

export default Profile;
