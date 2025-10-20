import React from "react";

const LoginForm = ({
  email,
  password,
  setEmail,
  setPassword,
  handleLogin,
  loading,
  error,
}) => {
  return (
    <form onSubmit={handleLogin} noValidate>
      <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>

      {error && (
        <div className="bg-red-200 text-red-700 p-2 mb-4 rounded text-center">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-gray-700">Email</label>
        <input
          type="email"
          className="w-full px-3 py-2 border rounded"
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
          className="w-full px-3 py-2 border rounded"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter Password"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 hover:bg-green-700 rounded"
        disabled={loading}
      >
        {loading ? "Loading..." : "Login"}
      </button>
    </form>
  );
};

export default LoginForm;
