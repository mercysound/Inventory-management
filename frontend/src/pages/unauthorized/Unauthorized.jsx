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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 text-center">
      <div className="app-surface rounded-3xl p-10 max-w-xl mx-4 text-center">
        <h1 className="text-4xl font-bold text-rose-400 mb-4">
          🚫 Unauthorized Access
        </h1>
        <p className="text-slate-300 mb-6 text-lg">
          You don't have permission to view this page.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 bg-slate-800 text-slate-100 rounded-lg shadow hover:bg-slate-700 transition"
          >
          Go Back
        </button>

        <button
          onClick={goToDashboard}
          className="px-5 py-2 bg-emerald-500 text-slate-950 rounded-lg shadow hover:bg-emerald-600 transition"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
