import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requireRole }) => {
  const { user } = useAuth();

  // Not logged in → redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // ✅ FIXED: Only redirect to complete-profile if the role actually needs it.
  // Staff accounts created by admin may have profileCompleted: false legitimately
  // and shouldn't be stuck in a redirect loop.
  const rolesRequiringProfileCompletion = ["customer"]; // add "staff" here if staff also self-register
  if (
    !user.profileCompleted &&
    rolesRequiringProfileCompletion.includes(user.role)
  ) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Role not allowed → unauthorized
  if (requireRole && !requireRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;