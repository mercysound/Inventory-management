// src/components/share-component/cart/FloatingCartButton.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ShoppingBag } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";

// Pages where the floating button should never appear
const CART_ROUTES = [
  "/user-dashboard/orders",
  "/wholesale-dashboard/orders",
  "/customer-dashboard/orders",
];

// Product page for each cart route — used for the "back to products" button
const PRODUCTS_ROUTE = {
  "/user-dashboard/orders":      "/user-dashboard",
  "/wholesale-dashboard/orders": "/wholesale-dashboard",
  "/customer-dashboard/orders":  "/customer-dashboard",
};

// How long (ms) after the last hide-request before the button reappears.
// Short enough to feel instant, long enough not to flicker during rapid events.
const HIDE_DEBOUNCE_MS = 400;

const FloatingCartButton = () => {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { cartCount, cartPath, hasCart } = useCart();

  const [bounce,    setBounce]    = useState(false);
  const [suppressed, setSuppressed] = useState(false); // true while near +/- buttons
  const [modalOpen,  setModalOpen]  = useState(false); // true while order modal is open

  const prevCountRef  = useRef(cartCount);
  const hideTimerRef  = useRef(null);

  // ── Bounce when count goes up ────────────────────────────────────────────
  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 700);
      prevCountRef.current = cartCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  // ── Modal visibility: hide while order modal is open ────────────────────
  useEffect(() => {
    const handler = (e) => setModalOpen(!!e?.detail?.open);
    window.addEventListener("modalVisibility", handler);
    return () => window.removeEventListener("modalVisibility", handler);
  }, []);

  // ── Hide near +/- buttons — timeout-based, never gets stuck ─────────────
  // Instead of counting hide/show events (which leak), we start a timer on
  // every hide request. As long as hide events keep coming the timer resets.
  // When they stop (user moved away), the button reappears after the debounce.
  const scheduleShow = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setSuppressed(false);
      hideTimerRef.current = null;
    }, HIDE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const hide = !!e?.detail?.hide;
      if (hide) {
        setSuppressed(true);
        scheduleShow(); // auto-restore after debounce even if leave event is missed
      } else {
        scheduleShow(); // explicit show — restore after short delay
      }
    };

    window.addEventListener("hideFloatingCart", handler);
    return () => {
      window.removeEventListener("hideFloatingCart", handler);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [scheduleShow]);

  // ── Scroll: always restore visibility when user scrolls ─────────────────
  // Prevents the button from staying hidden after user scrolls away from a
  // +/- button area on mobile (touchEnd can fire unreliably during scroll).
  useEffect(() => {
    const onScroll = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setSuppressed(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Route change: always restore visibility ──────────────────────────────
  useEffect(() => {
    setSuppressed(false);
    setModalOpen(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, [location.pathname]);

  // ── Guard: don't render for admin or roles without a cart ───────────────
  if (!user || user.role === "admin" || !hasCart) return null;

  const isCartPage    = CART_ROUTES.some((r) => location.pathname === r);
  const productsRoute = PRODUCTS_ROUTE[location.pathname];

  // ── On cart pages: show a "Go to Products" shortcut instead ─────────────
  if (isCartPage && productsRoute) {
    return (
      <AnimatePresence>
        <motion.button
          key="floating-products"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1,   y: 0  }}
          exit={{    opacity: 0, scale: 0.6, y: 20  }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          onClick={() => navigate(productsRoute)}
          aria-label="Go to Products"
          className="fixed z-40 flex items-center justify-center
            w-14 h-14 rounded-full
            bg-green-600 hover:bg-green-700 active:scale-95
            shadow-lg shadow-green-300/50
            transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-green-300"
          style={{
            bottom: "max(24px, calc(env(safe-area-inset-bottom, 0px) + 24px))",
            left:   "max(16px, calc(env(safe-area-inset-left,   0px) + 16px))",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <ShoppingBag size={22} className="text-white" />
        </motion.button>
      </AnimatePresence>
    );
  }

  const visible = cartCount > 0 && !modalOpen && !suppressed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="floating-cart"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1,   y: 0  }}
          exit={{    opacity: 0, scale: 0.6, y: 20  }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          onClick={() => navigate(cartPath)}
          aria-label={`View cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}`}
          className="fixed z-40 flex items-center justify-center
            w-14 h-14 rounded-full
            bg-indigo-600 hover:bg-indigo-700 active:scale-95
            shadow-lg shadow-indigo-300/50
            transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-indigo-300"
          style={{
            bottom: "max(24px, calc(env(safe-area-inset-bottom, 0px) + 24px))",
            left:   "max(16px, calc(env(safe-area-inset-left,   0px) + 16px))",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* Cart icon — bounces when item added */}
          <motion.div
            animate={bounce ? { y: [-4, 0, -3, 0] } : { y: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <ShoppingCart size={22} className="text-white" />
          </motion.div>

          {/* Count badge */}
          <AnimatePresence mode="popLayout">
            <motion.span
              key={cartCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{    scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="absolute -top-1 -right-1
                min-w-[22px] h-[22px] px-1.5
                bg-red-500 text-white
                text-[11px] font-bold rounded-full
                flex items-center justify-center
                shadow-md border-2 border-white pointer-events-none"
            >
              {cartCount > 99 ? "99+" : cartCount}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default React.memo(FloatingCartButton);
