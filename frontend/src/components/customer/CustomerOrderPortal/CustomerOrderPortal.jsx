import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerOrderTable from "./CustomerOrderTable";
import PaystackButton from "./PaystackButton";
import { useAuth } from "../../../context/AuthContext";
import PendingOrdersModal from "./PendingOrdersModal";
import ReceiptModal from "../../share-component/receipt/ReceiptModal";

const CustomerOrderPortal = () => {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // ================= RECEIPT STATES =================
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false);
  const [receiptBlob, setReceiptBlob] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");

  // ================= FETCH ORDERS =================
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const orderRes = await axiosInstance.get("/orders");
      const cartOrders = orderRes.data.data || orderRes.data.orders || [];

      const normalized = cartOrders.map((o) => ({
        ...o,
        total: o.total || o.quantity * o.price,
      }));

      setOrders(normalized);

      const historyRes = await axiosInstance.get("/placed-orders");
      const history = historyRes.data.orders || [];

      const pending = history.filter(
        (o) =>
          o.deliveryStatus?.toLowerCase() === "pending" ||
          o.deliveryStatus?.toLowerCase() === "processing"
      );

      setPendingOrders(pending);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ================= CART ACTIONS =================
  const handleIncreaseQty = async (orderId) => {
    try {
      const res = await axiosInstance.post(`/orders/increase/${orderId}`);
      if (res.data.success) fetchOrders();
      else toast.error(res.data.message);
    } catch {
      toast.error("Failed to increase quantity");
    }
  };

  const handleReduceQty = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;

    if (order.quantity <= 1) {
      handleDeleteOrder(orderId);
      return;
    }

    try {
      const res = await axiosInstance.post(`/orders/reduce/${orderId}`);
      if (res.data.success) fetchOrders();
    } catch {
      toast.error("Failed to reduce quantity");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (res.data.success) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
        toast.success("Item removed");
      }
    } catch {
      toast.error("Failed to remove item");
    }
  };

  // ================= TOTAL =================
  const grandTotal = orders.reduce(
    (sum, o) => sum + (o.total || o.quantity * o.price),
    0
  );

  // ================= PAYSTACK SUCCESS =================
  const handlePaymentSuccess = async () => {
    try {
      // 1️⃣ Complete order only after Paystack confirms payment
      const completeRes = await axiosInstance.post("/orders/complete", {
        paymentMethod: "Paystack",
        buyerName: user?.name || "Customer",
      });

      if (!completeRes.data.success) {
        const errorMessage = completeRes.data.message || "Order completion failed";
        toast.error(errorMessage);
        return;
      }

      toast.success("Payment successful");

      // 2️⃣ Fetch FINAL receipt (PDF)
      const query = new URLSearchParams({
        customerName: user?.name || "Customer",
        paymentMethod: "Paystack",
        mode: "final",
      }).toString();

      const res = await axiosInstance.get(`/orders/invoice?${query}`, {
        responseType: "blob",
      });

      // ✅ store blob for download
      setReceiptBlob(res.data);

      // ✅ create preview URL for iframe
      const blobUrl = URL.createObjectURL(res.data);
      setReceiptPreviewUrl(blobUrl);

      // ✅ open modal
      setShowReceiptPrompt(true);

      // clear UI only after successful completion
      setOrders([]);
      fetchOrders();
    } catch (err) {
      console.error("Order completion failed:", err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err.message || "Order completion failed";
      toast.error(errorMessage);
    }
  };

  // ================= DOWNLOAD RECEIPT =================
  const handleDownloadFinalReceipt = () => {
    if (!receiptBlob) {
      toast.error("Receipt not ready");
      return;
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(receiptBlob);
    link.download = `Receipt_${user?.name || "Customer"}.pdf`;
    link.click();

    // Close modal after download
    handleCloseReceiptModal();
  };

  // ================= CLOSE MODAL =================
  const handleCloseReceiptModal = () => {
    setShowReceiptPrompt(false);
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl("");
    setReceiptBlob(null);
  };


  // ================= CLEANUP ON UNMOUNT =================
  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [receiptPreviewUrl]);


  return (
    <div className="p-4 md:p-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">My Orders</h2>

        <button
          onClick={() => setShowPendingModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow"
        >
          View Pending Orders ({pendingOrders.length})
        </button>
      </div>

      {/* ================= ORDERS ================= */}
      {loading ? (
        <p className="text-gray-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">You have no orders.</p>
      ) : (
        <>
          <CustomerOrderTable
            orders={orders}
            onIncrease={handleIncreaseQty}
            onReduce={handleReduceQty}
            onDelete={handleDeleteOrder}
          />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold">
              Grand Total: ₦{grandTotal.toLocaleString()}
            </h3>

            <PaystackButton
              email={user.email}
              amount={grandTotal}
              name={user.name}
              reference={`order_${Date.now()}`}
              onSuccess={handlePaymentSuccess}
              onCancel={() => toast.info("Payment cancelled")}
            />
          </div>
        </>
      )}

      {/* ================= MODALS ================= */}
      <PendingOrdersModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingOrders={pendingOrders}
      />

      <ReceiptModal
        open={showReceiptPrompt}
        onClose={handleCloseReceiptModal}
        previewUrl={receiptPreviewUrl}
        role="customer"
        onDownload={handleDownloadFinalReceipt}
      />
    </div>
  );
};

export default CustomerOrderPortal;
