import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import PurchaseHistorySkeleton from "./PurchaseHistorySkeleton";
import PurchaseHistoryTable from "./PurchaseHistoryTable";
import { toast } from "react-toastify";

const PurchaseHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const fetchPurchaseHistory = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (dateRange.startDate && dateRange.endDate) {
        query.append("startDate", dateRange.startDate);
        query.append("endDate", dateRange.endDate);
      }

      const response = await axiosInstance.get(`/orders/history?${query.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
      });

      if (response.data.success) {
        setHistory(response.data.history);
      }
    } catch (error) {
      toast.error("Error fetching history");
      console.error("Error fetching purchase history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseHistory();
  }, []);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange({ ...dateRange, [name]: value });
  };

  const handleFilter = () => {
    if (dateRange.startDate && dateRange.endDate) fetchPurchaseHistory();
  };

  // 🧹 Clear All History
  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear ALL purchase history?")) return;
    try {
      await axiosInstance.delete(`/orders/history/clear`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
      });
      toast.success("All purchase history cleared");
      setHistory([]);
    } catch (error) {
      toast.error("Failed to clear history");
      console.error(error);
    }
  };

  // 🧹 Clear History for Specific Date
  const handleClearDate = async (date) => {
    if (!window.confirm(`Clear history for ${date}?`)) return;
    try {
      await axiosInstance.delete(`/orders/history/clear/${date}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
      });
      toast.success(`History for ${date} cleared`);
      fetchPurchaseHistory();
    } catch (error) {
      toast.error("Failed to clear date history");
      console.error(error);
    }
  };

  return (
    <div className="w-full min-h-screen p-4 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold">📅 Purchase History</h1>
        <button
          onClick={handleClearAll}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-all"
        >
          Clear All
        </button>
      </div>

      {/* Date Filter Section */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex gap-2">
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleFilter}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-all"
        >
          Filter
        </button>
      </div>

      {/* Main Section */}
      {loading ? (
        <PurchaseHistorySkeleton />
      ) : history.length > 0 ? (
        <PurchaseHistoryTable history={history} onClearDate={handleClearDate} />
      ) : (
        <div className="text-gray-500 text-center mt-10">
          No purchase history found.
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
