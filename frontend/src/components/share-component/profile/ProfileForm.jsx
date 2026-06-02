import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import LoadingButton from "../LoadingButton";

const ProfileForm = ({
  user,
  setUser,
  edit,
  setEdit,
  handleSubmit,
  handleCancel,
  changePassword,
  setChangePassword,
  passwordData,
  setPasswordData,
  saving,
}) => {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <form
      className="app-surface p-6 rounded-3xl shadow max-w-md"
      onSubmit={handleSubmit}
    >
      <h1 className="font-bold text-2xl mb-4 text-white">User Profile</h1>

      {/* NAME */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
        <input
          type="text"
          className="app-input"
          value={user.name}
          onChange={(e) => setUser({ ...user, name: e.target.value })}
          disabled={!edit}
          placeholder="Enter name"
        />
      </div>

      {/* EMAIL - always disabled */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
        <input
          type="email"
          className="app-input bg-slate-900 cursor-not-allowed"
          value={user.email}
          disabled
        />
      </div>

      {/* PHONE */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
        <input
          type="tel"
          className="app-input"
          value={user.phone || ""}
          onChange={(e) => setUser({ ...user, phone: e.target.value })}
          disabled={!edit}
          placeholder="Enter phone number"
        />
      </div>

      {/* ADDRESS */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">Address</label>
        <input
          type="text"
          className="app-input"
          value={user.address || ""}
          onChange={(e) => setUser({ ...user, address: e.target.value })}
          disabled={!edit}
          placeholder="Enter address"
        />
      </div>

      {/* PASSWORD SECTION */}
      {edit && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setChangePassword(!changePassword)}
            className="text-emerald-300 text-sm underline hover:text-white"
          >
            {changePassword ? "Cancel password change" : "Change password?"}
          </button>

          {changePassword && (
            <div className="mt-3 flex flex-col gap-3">

              {/* OLD PASSWORD */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOld ? "text" : "password"}
                    placeholder="Enter current password"
                    value={passwordData.oldPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, oldPassword: e.target.value })
                    }
                    className="app-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                  >
                    {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* NEW PASSWORD */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    className="app-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* CONFIRM NEW PASSWORD */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="app-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ACTION BUTTONS */}
      {!edit ? (
        <button
          type="button"
          className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-md hover:bg-emerald-600"
          onClick={() => setEdit(true)}
        >
          Edit Profile
        </button>
      ) : (
        <div className="flex gap-2 mt-2">
          <LoadingButton
            type="submit"
            loading={saving}
            className="bg-emerald-500 text-slate-950 py-2 px-4 rounded-md hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </LoadingButton>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="bg-slate-800 text-slate-100 px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
};

export default ProfileForm;