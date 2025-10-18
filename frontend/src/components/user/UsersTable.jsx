import React from "react";

const UsersTable = ({ users, handleDelete }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4 overflow-x-auto">
      {users.length === 0 ? (
        <div className="text-center text-gray-500">No Records</div>
      ) : (
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 p-2">S/N</th>
              <th className="border border-gray-200 p-2">Name</th>
              <th className="border border-gray-200 p-2">Email</th>
              <th className="border border-gray-200 p-2">Address</th>
              <th className="border border-gray-200 p-2">Role</th>
              <th className="border border-gray-200 p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={user._id}>
                <td className="border border-gray-200 p-2">{index + 1}</td>
                <td className="border border-gray-200 p-2">{user.name}</td>
                <td className="border border-gray-200 p-2">{user.email}</td>
                <td className="border border-gray-200 p-2">{user.address}</td>
                <td className="border border-gray-200 p-2">{user.role}</td>
                <td className="border border-gray-200 p-2">
                  <button
                    onClick={() => handleDelete(user._id)}
                    className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsersTable;
