import React, { useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import StaffTable from "./StaffTable";
import StaffSkeleton from "./StaffSkeleton";
import ReceiptModal from "../../share-component/receipt/ReceiptModal";

const STORE_ACCOUNT = {
  bankName: "MELECH BANK",
  accountName: "MELECH STORE",
  accountNumber: "1234567890",
};

const PAYMENT_OPTIONS = ["card", "bank_transfer", "cash_on_delivery", "paystack"];

const parseOrderError = (err) => {
  const raw = err?.response?.data?.message || err?.message || "";
  if (raw.startsWith("STOCK_ERROR:")) {
    const parts     = raw.replace("STOCK_ERROR:", "").split(":");
    const productName = parts[0] || "This item";
    const requested   = Number(parts[1]) || 0;
    const remaining   = Number(parts[2]) ?? 0;
    const stockLine = remaining === 0
      ? "It is now completely out of stock — remove it from the cart."
      : `Only ${remaining} unit${remaining !== 1 ? "s" : ""} available, but the cart has ${requested}. Please reduce the quantity to ${remaining} or less.`;
    return { title: "Stock Conflict", message: `"${productName}" — ${stockLine}`, type: "stock" };
  }
  if (raw.toLowerCase().includes("no active orders")) {
    return { title: "Cart is Empty", message: "No items in the cart. Add products before completing the order.", type: "empty" };
  }
  return { title: "Order Failed", message: raw || "Something went wrong.", type: "generic" };
};

const StaffOrders = () => {
  const [orders,         setOrders]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [paymentMethod,  setPaymentMethod]  = useState("");
  const [customerName,   setCustomerName]   = useState("");
  const [processing,     setProcessing]     = useState(false);
  const [isWholesale,    setIsWholesale]    = useState(() => {
    try {
      return localStorage.getItem("melech_staff_price_mode") === "wholesale";
    } catch {
      return false;
    }
  }); // ✅ wholesale toggle

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptBlob,      setReceiptBlob]      = useState(null);
  const [receiptMode,      setReceiptMode]      = useState("preview");

  // ── Fetch orders ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/orders");
      const data = Array.isArray(res.data) ? res.data : res.data.data || res.data.orders || [];
      setOrders(data);

      if (data.length > 0) {
        const serverWholesale = data.some((o) => o.priceMode === "wholesale");
        if (serverWholesale !== isWholesale) {
          setIsWholesale(serverWholesale);
          try {
            localStorage.setItem("melech_staff_price_mode", serverWholesale ? "wholesale" : "retail");
          } catch {
            // ignore storage failures
          }
        }
      }
    } catch (err) {
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }, [isWholesale]);

  useEffect(() => {
    fetchOrders();
    const handler = () => fetchOrders();
    window.addEventListener("ordersUpdated", handler);
    return () => window.removeEventListener("ordersUpdated", handler);
  }, [fetchOrders]);

  const handleToggleWholesale = async () => {
    const nextMode = isWholesale ? "retail" : "wholesale";
    const previousMode = isWholesale ? "wholesale" : "retail";
    try {
      const success = await axiosInstance.post(`/orders/set-price-mode/${nextMode}`);
      if (success.data?.success) {
        setIsWholesale(nextMode === "wholesale");
        try { localStorage.setItem("melech_staff_price_mode", nextMode); } catch {}
        try { window.dispatchEvent(new CustomEvent("priceModeChanged", { detail: { mode: nextMode } })); } catch {}
        await fetchOrders();
        toast.success(`Cart switched to ${nextMode} pricing`);
      } else {
        toast.error(success.data?.message || "Failed to update cart prices");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update cart prices");
    }
  };

  // ── Computed orders — apply wholesale price when toggle is ON ─────────────
  // The wholesale price comes from product.wholesalePrice.
  // If wholesalePrice is null/undefined, we fall back to the regular price.
  const displayOrders = orders.map((o) => {
    if (!isWholesale) return o;
    const wp = o.product?.wholesalePrice ?? o.wholesalePrice ?? null;
    if (!wp) return o; // no wholesale price defined, keep original
    const effectivePrice = wp;
    return {
      ...o,
      price:      effectivePrice,
      totalPrice: effectivePrice * o.quantity,
    };
  });

  const grandTotal = displayOrders.reduce(
    (sum, o) => sum + (o.totalPrice || o.quantity * o.price || 0),
    0
  );

  // ── Cart actions — optimistic UI ──────────────────────────────────────────
  const handleIncreaseQty = async (orderId) => {
    const prev = orders;
    setOrders((os) => os.map((o) =>
      o._id === orderId ? { ...o, quantity: o.quantity + 1, totalPrice: (o.quantity + 1) * o.price } : o
    ));
    try {
      await axiosInstance.post(`/orders/increase/${orderId}`);
    } catch (err) {
      setOrders(prev);
      toast.error(err?.response?.data?.message || "Failed to increase quantity");
    }
  };

  const handleReduceQty = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;
    const prev = orders;
    if (order.quantity <= 1) {
      setOrders((os) => os.filter((o) => o._id !== orderId));
      try { await axiosInstance.post(`/orders/reduce/${orderId}`); }
      catch { setOrders(prev); toast.error("Failed to reduce quantity"); }
      return;
    }
    setOrders((os) => os.map((o) =>
      o._id === orderId ? { ...o, quantity: o.quantity - 1, totalPrice: (o.quantity - 1) * o.price } : o
    ));
    try { await axiosInstance.post(`/orders/reduce/${orderId}`); }
    catch { setOrders(prev); toast.error("Failed to reduce quantity"); }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this item?")) return;
    const prev = orders;
    setOrders((os) => os.filter((o) => o._id !== orderId));
    try {
      await axiosInstance.delete(`/orders/remove/${orderId}`);
      toast.success("Item deleted");
    } catch { setOrders(prev); toast.error("Failed to delete item"); }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all orders?")) return;
    try {
      await axiosInstance.delete("/orders/clear");
      setOrders([]);
      toast.success("All orders cleared");
    } catch { toast.error("Failed to clear orders"); }
  };

  const handleApiError = (err) => {
    const { title, message, type } = parseOrderError(err);
    if (type === "stock") {
      toast.error(<div><p className="font-semibold text-sm">{title}</p><p className="text-xs mt-1 leading-relaxed">{message}</p></div>, { autoClose: 9000 });
      fetchOrders();
    } else {
      toast.error(`${title}: ${message}`);
    }
  };

  // ── Preview invoice ───────────────────────────────────────────────────────
  const previewInvoice = async () => {
    if (!orders.length) return toast.error("No orders to preview");
    try {
      setProcessing(true);
      const query = new URLSearchParams({
        mode: "preview",
        customerName: customerName || "Walk-in Customer",
        paymentMethod: paymentMethod || "Not Specified",
        isWholesale: String(isWholesale),
        orderSource: "staff",
      }).toString();
      const res = await axiosInstance.get(`/orders/invoice?${query}`, { responseType: "blob" });
      setReceiptBlob(res.data);
      setReceiptMode("preview");
      setShowReceiptModal(true);
    } catch { toast.error("Failed to generate preview"); }
    finally { setProcessing(false); }
  };

  // ── Complete order ────────────────────────────────────────────────────────
  const completeOrder = async () => {
    if (!paymentMethod) return toast.error("Select payment method first");
    if (!orders.length) return toast.error("No orders to complete");
    setProcessing(true);
    try {
      const res = await axiosInstance.post("/orders/complete", {
        paymentMethod,
        buyerName: customerName || "Walk-in Customer",
        isWholesale, // ✅ pass to backend so receipt reflects wholesale pricing
      });
      if (res.data.success) {
        toast.success("Order completed successfully");
        const query = new URLSearchParams({
          mode: "final",
          orderSource: "staff",
          customerName: customerName || "Walk-in Customer",
          paymentMethod,
          isWholesale: String(isWholesale),
          historyReceipt: "true",
        }).toString();
        const invoiceRes = await axiosInstance.get(`/orders/invoice?${query}`, { responseType: "blob" });
        setReceiptBlob(invoiceRes.data);
        setReceiptMode("final");
        setShowReceiptModal(true);
        setOrders([]);
        setCustomerName("");
        setPaymentMethod("");
        setIsWholesale(false);
        try { localStorage.setItem("melech_staff_price_mode", "retail"); } catch {};
      }
    } catch (err) { handleApiError(err); }
    finally { setProcessing(false); }
  };

  const handleDownloadReceipt = () => {
    if (!receiptBlob) return;
    const link = document.createElement("a");
    const url = URL.createObjectURL(receiptBlob);
    link.href = url;
    link.download = receiptMode === "preview"
      ? `Invoice_UNPAID_${customerName || "Walk-in"}.pdf`
      : `Receipt_PAID_${customerName || "Walk-in"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    handleCloseReceiptModal();
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptBlob(null);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto bg-white/80 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl p-6 mt-8">

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">🧾 Customer Orders Summary</h2>

        {/* Controls */}
        <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">

            {/* Left controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-wrap">
              <input type="text" placeholder="Enter customer name" value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 transition-all" />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full sm:w-56 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 transition-all">
                <option value="">-- Select Payment Method --</option>
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              {/* ✅ Wholesale toggle */}
              <button
                type="button"
                onClick={handleToggleWholesale}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-sm transition-all ${
                  isWholesale
                    ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200"
                    : "bg-white border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600"
                }`}
              >
                <span className="text-base">{isWholesale ? "🏪" : "🛍"}</span>
                {isWholesale ? "Wholesale mode ON" : "Switch to Wholesale"}
              </button>
            </div>

            {/* Right buttons */}
            <div className="flex flex-wrap justify-end gap-3 w-full lg:w-auto">
              <button onClick={previewInvoice} disabled={processing}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg shadow-md transition-all disabled:opacity-60">
                Preview Invoice
              </button>
              <button onClick={completeOrder} disabled={processing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all disabled:opacity-60">
                Complete Order
              </button>
              <button onClick={handleClearAll}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all">
                Clear All
              </button>
            </div>
          </div>

          {/* Wholesale notice banner */}
          {isWholesale && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
              <span className="text-base">🏪</span>
              <span>
                <strong>Wholesale mode active</strong> — all prices are showing wholesale rates.
                Grand total reflects wholesale pricing. Products without a wholesale price retain their retail price.
              </span>
            </motion.div>
          )}
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <StaffSkeleton key={i} />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <StaffTable
              orders={displayOrders}       // ✅ pass computed orders with wholesale prices applied
              onIncreaseQty={handleIncreaseQty}
              onReduceQty={handleReduceQty}
              onRemoveOrder={handleDeleteOrder}
              isWholesale={isWholesale}    // ✅ pass so table can show a badge
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-3">
          {isWholesale && (
            <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              🏪 Wholesale pricing
            </span>
          )}
          <span className="font-semibold text-lg text-gray-800">
            Grand Total: ₦{grandTotal.toLocaleString()}
          </span>
        </div>
      </motion.div>

      <ReceiptModal
        open={showReceiptModal}
        onClose={handleCloseReceiptModal}
        blob={receiptBlob}
        mode={receiptMode}
        role="staff"
        storeAccount={STORE_ACCOUNT}
        onDownload={handleDownloadReceipt}
      />
    </>
  );
};

export default StaffOrders;
