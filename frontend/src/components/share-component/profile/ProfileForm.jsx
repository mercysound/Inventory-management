import React from "react";

const ProfileForm = ({ user, setUser, edit, setEdit, handleSubmit }) => {
  return (
    <form
      className="bg-white p-6 rounded-lg shadow max-w-md"
      onSubmit={handleSubmit}
    >
      <h1 className="font-bold text-2xl">User Profile</h1>

      <div className="mb-4 mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name:
        </label>
        <input
          type="text"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
          value={user.name}
          onChange={(e) => setUser({ ...user, name: e.target.value })}
          disabled={!edit}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email:
        </label>
        <input
          type="text"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
          value={user.email}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
          disabled={!edit}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address:
        </label>
        <input
          type="text"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
          value={user.address}
          onChange={(e) => setUser({ ...user, address: e.target.value })}
          disabled={!edit}
        />
      </div>

      {edit && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter new password (optional)"
            onChange={(e) => setUser({ ...user, password: e.target.value })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {!edit ? (
        <button
          type="button"
          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 cursor-pointer"
          onClick={() => setEdit(true)}
        >
          Edit Profile
        </button>
      ) : (
        <>
          <button
            type="submit"
            className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 cursor-pointer"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => setEdit(false)}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 ml-2 cursor-pointer"
          >
            Cancel
          </button>
        </>
      )}
    </form>
  );
};

export default ProfileForm;
