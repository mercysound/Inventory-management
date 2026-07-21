// src/utils/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requireRole }) => {
  const { user }   = useAuth();
  const location   = useLocation();

  if (!user) {
    // Preserve the intended URL so LoginPage can redirect there after login
    const intended = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(intended)}`} replace />;
  }

  if (requireRole && !requireRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
