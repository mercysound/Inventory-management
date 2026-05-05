import React from "react";

const UsersTable = ({ users, handleDelete }) => {
  return (
    <div className="overflow-x-auto">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        {users.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No Records</div>
        ) : (
          <table className="min-w-max w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">S/N</th>
                <th className="border p-3 text-left">Name</th>
                <th className="border p-3 text-left">Email</th>
                <th className="border p-3 text-left">Address</th>
                <th className="border p-3 text-left">Phone</th>
                <th className="border p-3 text-left">Role</th>
                <th className="border p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="border p-3">{index + 1}</td>
                  <td className="border p-3 font-medium">{user.name}</td>
                  <td className="border p-3">{user.email}</td>
                  <td className="border p-3">{user.address}</td>
                  <td className="border p-3">{user.phone}</td>
                  <td className="border p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {users.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No Records</div>
        ) : (
          users.map((user, index) => (
            <div key={user._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">{user.name}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="space-y-2 mb-3">
                <p className="text-sm"><span className="font-medium">Address:</span> {user.address}</p>
                <p className="text-sm"><span className="font-medium">Phone:</span> {user.phone || 'N/A'}</p>
              </div>
              <button
                onClick={() => handleDelete(user._id)}
                className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors"
              >
                Delete User
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UsersTable;
