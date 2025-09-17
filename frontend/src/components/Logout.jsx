import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router';
import { useEffect } from 'react';

const Logout = () => {
  const navigate = useNavigate();
  const {logout} = useAuth();
  useEffect(() => {
    logout();           // ✅ run after render
    navigate('/login'); // ✅ navigate after render
  }, [logout, navigate]);

  // You can render nothing or a small message/spinner
  return null;
};

export default Logout;
