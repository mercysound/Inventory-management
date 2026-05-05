import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ProfileForm from "./ProfileForm";
import ProfileSkeleton from "./ProfileSkeleton";
import axiosInstance from "../../../utils/axiosInstance";

const Profile = () => {
  const [user, setUser] = useState({
    name: "",
    email: "",
    address: "",
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [edit, setEdit] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

 const fetchUser = async () => {
  try {
    const response = await axiosInstance.get("/users/profile");
    if (response.data.success) {
      const data = response.data._doc; // ✅ data lives here

      setUser({
        name: data?.name || "",
        email: data?.email || "",
        address: data?.address || "",
         phone: data?.phone || "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate password fields if changing password
    if (changePassword) {
      if (!passwordData.oldPassword) {
        return toast.error("Please enter your current password");
      }
      if (!passwordData.newPassword) {
        return toast.error("Please enter a new password");
      }
      if (passwordData.newPassword.length < 6) {
        return toast.error("New password must be at least 6 characters");
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        return toast.error("New passwords do not match");
      }
    }

    setSaving(true);
    try {
      const payload = { ...user };

      if (changePassword) {
        payload.oldPassword = passwordData.oldPassword;
        payload.password = passwordData.newPassword;
      }

      const response = await axiosInstance.put("/users/profile", payload);
      if (response.data.success) {
        toast.success("Profile updated successfully");
        setEdit(false);
        setChangePassword(false);
        setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      // ✅ show backend error message if available
      toast.error(error.response?.data?.message || "Error updating profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEdit(false);
    setChangePassword(false);
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    fetchUser(); // ✅ re-fetch to reset any unsaved changes
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
        handleCancel={handleCancel}
        changePassword={changePassword}
        setChangePassword={setChangePassword}
        passwordData={passwordData}
        setPasswordData={setPasswordData}
        saving={saving}
      />
    </div>
  );
};

export default Profile;