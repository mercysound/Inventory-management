import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requireRole }) => {
  const { user } = useAuth();

  // Not logged in → redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Logged in but profile incomplete → force redirect
  if (!user.profileCompleted) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Role not allowed → unauthorized
  if (requireRole && !requireRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
