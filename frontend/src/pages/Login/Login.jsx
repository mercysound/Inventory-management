import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import axiosInstance from "../../utils/axiosInstance";
import LoginForm from "./LoginForm";
import LoginSkeleton from "./LoginSkeleton";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post("/auth/login", { email, password });

      if (response.data.success) {
        await login(response.data.user, response.data.token);

        if (response.data.user.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/customer-dashboard");
        }
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message || "Login failed");
      } else {
        setError("Network error, please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center h-screen justify-center bg-gradient-to-b from-indigo-600 from-50% to-gray-100 to-50% space-y-6">
      <h2 className="text-3xl text-center text-white">Melech Solution Hub System</h2>

      {loading ? (
        <LoginSkeleton />
      ) : (
        <LoginForm onLogin={handleLogin} error={error} />
      )}
    </div>
  );
};

export default Login;
