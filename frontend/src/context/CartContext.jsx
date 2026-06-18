// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

// Roles that have a cart
const CART_ROLES = ["customer", "wholesale", "staff"];

// Cart path per role
export const cartPathByRole = (role) => {
  if (role === "staff")     return "/customer-dashboard/orders";
  if (role === "wholesale") return "/wholesale-dashboard/orders";
  return "/user-dashboard/orders"; // customer
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const intervalRef = useRef(null);
  const eventTimerRef = useRef(null);
  const cartCountRef = useRef(cartCount);

  const hasCart = user && CART_ROLES.includes(user.role);

  // Fetch the cart count from the server
  const fetchCartCount = useCallback(async () => {
    if (!hasCart) { setCartCount(0); return; }
    try {
      const res = await axiosInstance.get("/orders");
      // res.data is the sanitized orders array or wrapped object
      const orders = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.orders || [];
      const total = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
      setCartCount(total);
      cartCountRef.current = total;
    } catch {
      // Silently fail — cart count is non-critical
    }
  }, [hasCart]);

  // Increment locally (called after adding an item — no re-fetch needed)
  const incrementCart = useCallback((qty = 1) => {
    setCartCount((prev) => prev + qty);
  }, []);

  // Decrement locally
  const decrementCart = useCallback((qty = 1) => {
    setCartCount((prev) => Math.max(0, prev - qty));
  }, []);

  // Full reset (called after checkout or clear cart)
  const resetCart = useCallback(() => setCartCount(0), []);

  // Re-fetch (called when we need ground truth — e.g. after page load)
  const refreshCartCount = useCallback(() => fetchCartCount(), [fetchCartCount]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  // Poll every 3 minutes as a safety net (catches external changes)
  useEffect(() => {
    if (!hasCart) return;
    intervalRef.current = setInterval(fetchCartCount, 3 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [hasCart, fetchCartCount]);

  // Subscribe to server-sent events to react to product price changes
  useEffect(() => {
    if (!hasCart) return;

    const token = localStorage.getItem('pos-token');
    if (!token) return;

    const base = import.meta.env.VITE_API_URL || '/api';
    const url = `${base}/orders/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    const scheduleRefresh = () => {
      if (eventTimerRef.current) return;
      eventTimerRef.current = window.setTimeout(async () => {
        eventTimerRef.current = null;
        await fetchCartCount();
      }, 400);
    };

    const handlePriceChange = () => {
      const total = cartCountRef.current;
      window.dispatchEvent(new CustomEvent('ordersUpdated', {
        detail: {
          total,
          priceChanged: true,
          updatedAt: new Date().toISOString(),
        },
      }));
      scheduleRefresh();
    };

    es.addEventListener('productPriceChanged', handlePriceChange);
    es.addEventListener('open', () => {
      console.log('Cart SSE connected');
    });
    es.addEventListener('error', () => {
      console.warn('Cart SSE error, closing and retrying later');
      es.close();
    });

    return () => {
      if (eventTimerRef.current) {
        clearTimeout(eventTimerRef.current);
        eventTimerRef.current = null;
      }
      es.close();
    };
  }, [hasCart, fetchCartCount]);

  // Listen for the custom event fired by order pages
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail;
      if (detail && typeof detail.total === "number") {
        setCartCount(detail.total);
        return;
      }
      fetchCartCount();
    };
    window.addEventListener("ordersUpdated", handler);
    return () => window.removeEventListener("ordersUpdated", handler);
  }, [fetchCartCount]);

  return (
    <CartContext.Provider value={{
      cartCount,
      incrementCart,
      decrementCart,
      resetCart,
      refreshCartCount,
      cartPath: hasCart ? cartPathByRole(user.role) : null,
      hasCart: !!hasCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
