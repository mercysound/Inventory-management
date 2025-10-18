import axiosInstance from '../utils/axiosInstance';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const Summary = () => {
  const [dashBoardData, setDashboardData] = useState({
    totalProducts: 0,
    totalStock: 0,
    ordersToday: 0,
    revenue: 0,
    outOfStock: [],
    highestSaleProduct: null,
    lowStock: [],
  });

  const [loading, setLoading] = useState(false);

  const fetchDashbordData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/dashboard`);
      setDashboardData(response.data.dashboardData);
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashbordData();
  }, []);

  // =============================
  // 🦴 Skeleton Loader
  // =============================
  if (loading) {
    return (
      <div role="status" className="p-5 animate-pulse">
        <h2 className="text-3xl font-bold mb-6 bg-gray-300 h-8 w-48 rounded"></h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          {[1, 2, 3, 4].map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 p-4 rounded-xl shadow-md flex flex-col items-center justify-center h-28"
            >
              <div className="bg-gray-300 h-5 w-32 rounded mb-3"></div>
              <div className="bg-gray-400 h-6 w-20 rounded"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-xl shadow-md flex flex-col justify-between"
            >
              <div className="bg-gray-300 h-6 w-40 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="bg-gray-200 h-4 rounded w-full"></div>
                <div className="bg-gray-200 h-4 rounded w-5/6"></div>
                <div className="bg-gray-200 h-4 rounded w-4/6"></div>
                <div className="bg-gray-200 h-4 rounded w-3/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =============================
  // 🌈 Main Dashboard UI
  // =============================
  return (
    <div className="p-5 min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6">📊 Dashboard Overview</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-blue-500 hover:bg-blue-600 transition-all duration-300 text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-80">Total Products</p>
          <p className="text-3xl font-bold mt-1">{dashBoardData.totalProducts}</p>
        </div>

        <div className="bg-green-500 hover:bg-green-600 transition-all duration-300 text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-80">Total Stock</p>
          <p className="text-3xl font-bold mt-1">{dashBoardData.totalStock}</p>
        </div>

        <div className="bg-yellow-500 hover:bg-yellow-600 transition-all duration-300 text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-80">Orders Today</p>
          <p className="text-3xl font-bold mt-1">{dashBoardData.ordersToday}</p>
        </div>

        <div className="bg-purple-500 hover:bg-purple-600 transition-all duration-300 text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-80">Revenue</p>
          <p className="text-3xl font-bold mt-1">₦{dashBoardData.revenue}</p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Out of Stock */}
        <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            🚫 Out of Stock Products
          </h3>
          {dashBoardData.outOfStock.length > 0 ? (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {dashBoardData.outOfStock.map((product, index) => (
                <li
                  key={index}
                  className="border-b border-gray-100 pb-2 text-gray-700"
                >
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    Category: {product.categoryId.name}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">All products are in stock 🎉</p>
          )}
        </div>

        {/* Highest Sale Product */}
        <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            🏆 Highest Sale Product
          </h3>
          {dashBoardData.highestSaleProduct?.name ? (
            <div className="text-gray-700 space-y-1">
              <p><strong>Name:</strong> {dashBoardData.highestSaleProduct.name}</p>
              <p><strong>Category:</strong> {dashBoardData.highestSaleProduct.category}</p>
              <p><strong>Total Unit Sold:</strong> {dashBoardData.highestSaleProduct.totalQuantity}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              {dashBoardData.highestSaleProduct?.message || "No data available"}
            </p>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            ⚠️ Low Stock Products
          </h3>
          {dashBoardData.lowStock.length > 0 ? (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {dashBoardData.lowStock.map((product, index) => (
                <li
                  key={index}
                  className="border-b border-gray-100 pb-2 text-gray-700"
                >
                  <strong>{product.name}</strong> — {product.stock} left{" "}
                  <span className="text-sm text-gray-500">
                    ({product.categoryId.name})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No low stock products ✅</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Summary;
