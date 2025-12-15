// src/components/common/ReceiptPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import axiosInstance from "../../../utils/axiosInstance";

const ReceiptPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchReceipt = async () => {
    try {
      const res = await axiosInstance.get(`/orders/receipt/${id}`);
      if (res.data && res.data.success) setOrder(res.data.order);
      else toast.error("Failed to load receipt");
    } catch (err) {
      console.error("fetchReceipt error:", err);
      toast.error("Failed to load receipt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
  try {
    setDownloading(true);

    const res = await axiosInstance.get(
      `/orders/invoice?mode=final&id=${id}`,
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Receipt_${id}.pdf`);
    document.body.appendChild(link);
    link.click();

    toast.success("Receipt downloaded successfully");

  } catch (error) {
    console.log("handleDownload error:", error);
    toast.error("Failed to download receipt");
  } finally {
    setDownloading(false);
  }
};


  if (loading) return <p className="text-center mt-10">Loading Receipt...</p>;
  if (!order) return <p className="text-center text-red-500 mt-10">Receipt not found</p>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-6 mt-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center text-indigo-700">🧾 Order Receipt</h2>

      <div className="bg-gray-50 p-4 rounded-lg border">
        <p><strong>Name:</strong> {order.buyerName}</p>
        <p><strong>Payment Method:</strong> {order.paymentMethod || "Unknown"}</p>
        <p><strong>Total Quantity:</strong> {order.allQuantity}</p>
        <p><strong>Total Price:</strong> ₦{(order.totalPrice || 0).toLocaleString()}</p>
        <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-2">Purchased Items</h3>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="p-2">Product</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Price</th>
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.productList.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{item.productId?.name || "Unknown"}</td>
                <td className="p-2">{item.quantity}</td>
                <td className="p-2">₦{(item.price || 0).toLocaleString()}</td>
                <td className="p-2">₦{(item.totalPrice || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-between">
        <Link to="/staff-dashboard" className="px-4 py-2 bg-gray-500 text-white rounded-lg">Back</Link>
        <div>
          <button onClick={handleDownload} disabled={downloading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg mr-3">
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ReceiptPage;
