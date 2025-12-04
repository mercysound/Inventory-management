// src/api/axiosInstance.js
import axios from "axios";
import { toast } from "react-toastify";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Automatically attach token to each request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("pos-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatically handle expired token (401)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Only auto-logout when user ALREADY logged in
    const token = localStorage.getItem("pos-token");

    if (status === 401 && token) {
      // Token expired → force logout
      localStorage.removeItem("pos-token");
      localStorage.removeItem("pos-user");
      window.location.href = "/";
    }

    // For login failure (no token yet) → DO NOT RELOAD
    return Promise.reject(error);
  }
);

export default axiosInstance;
