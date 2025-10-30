import axiosInstance from "../utils/axiosInstance";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FaBoxOpen, FaCubes, FaMoneyBillWave, FaShoppingCart } from "react-icons/fa";
import { motion } from "framer-motion";

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

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Loading dashboard data...
      </div>
    );
  }

  const { totalProducts, totalStock, ordersToday, revenue, outOfStock, highestSaleProduct, lowStock } =
    dashBoardData;

  return (
    <div className="p-5 min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center md:text-left">
        📊 Dashboard Overview
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            title: "Total Products",
            value: totalProducts,
            icon: <FaBoxOpen className="text-3xl" />,
            color: "bg-blue-500",
          },
          {
            title: "Total Stock",
            value: totalStock,
            icon: <FaCubes className="text-3xl" />,
            color: "bg-green-500",
          },
          {
            title: "Orders Today",
            value: ordersToday,
            icon: <FaShoppingCart className="text-3xl" />,
            color: "bg-yellow-500",
          },
          {
            title: "Revenue",
            value: `₦${revenue.toLocaleString()}`,
            icon: <FaMoneyBillWave className="text-3xl" />,
            color: "bg-purple-500",
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className={`${card.color} text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center transition-all`}
          >
            <div className="mb-2">{card.icon}</div>
            <p className="text-sm font-medium opacity-90">{card.title}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Detailed Insight Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Out of Stock */}
        <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition-all">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            🚫 Out of Stock Products
          </h3>
          {outOfStock.length > 0 ? (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {outOfStock.map((product, index) => (
                <li key={index} className="border-b border-gray-100 pb-2">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    Category: {product.categoryId?.name || "N/A"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">All products are in stock 🎉</p>
          )}
        </div>

        {/* Highest Sale Product */}
        <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition-all">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            🏆 Highest Sale Product
          </h3>
          {highestSaleProduct?.name ? (
            <div className="text-gray-700 space-y-1">
              <p><strong>Name:</strong> {highestSaleProduct.name}</p>
              <p><strong>Category:</strong> {highestSaleProduct.category}</p>
              <p><strong>Total Unit Sold:</strong> {highestSaleProduct.totalQuantity}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              {highestSaleProduct?.message || "No sale data available"}
            </p>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition-all">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            ⚠️ Low Stock Products
          </h3>
          {lowStock.length > 0 ? (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {lowStock.map((product, index) => (
                <li key={index} className="border-b border-gray-100 pb-2">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    {product.stock} left ({product.categoryId?.name || "N/A"})
                  </p>
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
