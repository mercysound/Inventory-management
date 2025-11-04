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
    if (error.response?.status === 401) {
      toast.error("Session expired. Please log in again.");
      localStorage.removeItem("pos-token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
