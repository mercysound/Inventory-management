import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const doLogout = async () => {
      await logout();
      navigate("/", { replace: true });
    };

    doLogout();
  }, [logout, navigate]);

  return null;
};

export default Logout;
