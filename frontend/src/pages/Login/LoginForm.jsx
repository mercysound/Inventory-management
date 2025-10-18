import React, { useState } from "react";

const LoginForm = ({ onLogin, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="border shadow-lg p-6 w-80 bg-white">
      <h2 className="text-2xl font-bold mb-4">Login</h2>

      {error && (
        <div className="bg-red-200 text-red-700 p-2 mb-4 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter Email"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 hover:bg-green-700"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
