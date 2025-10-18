import React, { useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";

const OrderModal = ({ orderData, setOrderData, closeModal, refreshProducts }) => {
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (e) => {
    const quantity = parseInt(e.target.value) || 1;
    if (quantity > orderData.stock) {
      toast.warning("Not enough stock available");
      return;
    }
    setOrderData((prev) => ({
      ...prev,
      quantity,
      total: quantity * prev.price,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosInstance.post("/orders/add", orderData);
      if (res.data.success) {
        toast.success("Order placed successfully!");
        refreshProducts();
        closeModal();
      }
    } catch (err) {
      toast.error("Error placing order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 relative">
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 text-xl font-bold text-gray-700 hover:text-red-600"
        >
          ×
        </button>

        <h2 className="text-xl font-bold mb-4">Place Order</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            name="quantity"
            value={orderData.quantity}
            min="0"
            onChange={handleQuantityChange}
            className="border border-gray-300 rounded p-2 w-full"
            placeholder="Quantity"
          />

          <p className="text-gray-700 font-semibold">
            Total: ₦{orderData.total.toLocaleString()}
          </p>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              {loading ? "Placing..." : "Order"}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;
