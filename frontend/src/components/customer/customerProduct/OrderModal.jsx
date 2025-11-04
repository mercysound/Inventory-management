// frontend/src/components/customer/OrderModal.jsx
import React, { useState } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";

const OrderModal = ({ orderData, setOrderData, closeModal, refreshProducts }) => {
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (e) => {
    const value = e.target.value;

    // Allow empty while typing
    if (value === "") {
      setOrderData((prev) => ({ ...prev, quantity: "", total: 0 }));
      return;
    }

    const quantity = parseInt(value, 10);
    if (isNaN(quantity)) return;

    if (quantity < 1) {
      toast.warning("Order must be at least 1");
      return;
    }

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

  // If quantity is changed via buttons (optional helper)
  const changeBy = (delta) => {
    const current = Number(orderData.quantity) || 0;
    const next = current + delta;
    if (next < 1) return;
    if (next > orderData.stock) {
      toast.warning("Not enough stock available");
      return;
    }
    setOrderData((prev) => ({
      ...prev,
      quantity: next,
      total: next * prev.price,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If orderData.orderId exists, update existing order
      if (orderData.orderId) {
        const res = await axiosInstance.patch(`/orders/update/${orderData.orderId}`, {
          quantity: orderData.quantity,
          total: orderData.total,
          price: orderData.price,
        });

        if (res.data.success) {
          toast.success("Order updated successfully");
          // notify other components (CustomerOrders) to refresh
          window.dispatchEvent(new Event("ordersUpdated"));
          refreshProducts();
          closeModal();
        } else {
          toast.error(res.data.message || "Failed to update order");
        }
      } else {
        // Otherwise create new order
        const res = await axiosInstance.post("/orders/add", {
          productId: orderData.productId,
          quantity: orderData.quantity,
          total: orderData.total,
          price: orderData.price,
        });

        if (res.data.success) {
          toast.success("Order placed successfully!");
          window.dispatchEvent(new Event("ordersUpdated"));
          refreshProducts();
          closeModal();
        } else {
          toast.error(res.data.message || "Failed to place order");
        }
      }
    } catch (err) {
      console.error("Order submit error:", err);
      // Prefer backend message if available
      const msg = err?.response?.data?.message || err?.response?.data?.error;
      if (msg) toast.error(msg);
      else toast.error("Error placing/updating order");
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeBy(-1)}
              className="px-3 py-1 bg-yellow-200 rounded"
            >
              -
            </button>
            <input
              type="number"
              name="quantity"
              value={orderData.quantity}
              min="1"
              onChange={handleQuantityChange}
              className="border border-gray-300 rounded p-2 w-full"
              placeholder="Quantity"
              required
            />
            <button
              type="button"
              onClick={() => changeBy(1)}
              className="px-3 py-1 bg-green-200 rounded"
            >
              +
            </button>
          </div>

          <p className="text-gray-700 font-semibold">
            Total: ₦{Number(orderData.total || 0).toLocaleString()}
          </p>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              {loading ? "Saving..." : orderData.orderId ? "Update Order" : "Order"}
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
