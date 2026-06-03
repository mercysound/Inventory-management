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

  // Listen for the custom event fired by order pages
  useEffect(() => {
    const handler = () => fetchCartCount();
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
