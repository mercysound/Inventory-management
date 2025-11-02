import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Function to redirect based on user role
  const goToDashboard = () => {
    if (!user) return navigate("/", { replace: true });
    if (user.role === "admin") navigate("/admin-dashboard", { replace: true });
    else if (user.role === "staff") navigate("/customer-dashboard", { replace: true });
    else if (user.role === "customer") navigate("/user-dashboard", { replace: true });
    else navigate("/", { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-4">
        🚫 Unauthorized Access
      </h1>
      <p className="text-gray-700 mb-6 text-lg">
        You don't have permission to view this page.
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 bg-gray-700 text-white rounded-lg shadow hover:bg-gray-800 transition"
        >
          Go Back
        </button>

        <button
          onClick={goToDashboard}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
