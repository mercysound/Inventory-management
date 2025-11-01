import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Protects routes by checking login + role,
 * but keeps your sidebar/layout visible.
 */
const ProtectedRoute = ({ children, requireRole }) => {
  const { user } = useAuth();

  // Not logged in → send to landing page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Logged in but role not allowed → send to unauthorized page
  if (requireRole && !requireRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Authorized → render the dashboard layout + children
  return children;
};

export default ProtectedRoute;
