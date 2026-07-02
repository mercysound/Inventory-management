// src/components/share-component/cart/FloatingCartButton.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ShoppingBag } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";

const CART_ROUTES = [
  "/user-dashboard/orders",
  "/wholesale-dashboard/orders",
  "/customer-dashboard/orders",
];

const PRODUCTS_ROUTE = {
  "/user-dashboard/orders":      "/user-dashboard",
  "/wholesale-dashboard/orders": "/wholesale-dashboard",
  "/customer-dashboard/orders":  "/customer-dashboard",
};

const HIDE_DEBOUNCE_MS = 400;

// Common bottom-right position — same anchor for both buttons
const POSITION_STYLE = {
  bottom: "max(24px, calc(env(safe-area-inset-bottom, 0px) + 24px))",
  right:  "max(16px, calc(env(safe-area-inset-right,  0px) + 16px))",
  WebkitTapHighlightColor: "transparent",
};

const FloatingCartButton = () => {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { cartCount, cartPath, hasCart } = useCart();

  const [bounce,     setBounce]     = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);

  const prevCountRef = useRef(cartCount);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 700);
      prevCountRef.current = cartCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    const handler = (e) => setModalOpen(!!e?.detail?.open);
    window.addEventListener("modalVisibility", handler);
    return () => window.removeEventListener("modalVisibility", handler);
  }, []);

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
      if (hide) { setSuppressed(true); scheduleShow(); }
      else { scheduleShow(); }
    };
    window.addEventListener("hideFloatingCart", handler);
    return () => {
      window.removeEventListener("hideFloatingCart", handler);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [scheduleShow]);

  useEffect(() => {
    const onScroll = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setSuppressed(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setSuppressed(false);
    setModalOpen(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, [location.pathname]);

  if (!user || user.role === "admin" || !hasCart) return null;

  const isCartPage    = CART_ROUTES.some((r) => location.pathname === r);
  const productsRoute = PRODUCTS_ROUTE[location.pathname];

  // ── On cart pages: show "Products" pill ─────────────────────────────────
  if (isCartPage && productsRoute) {
    return (
      <AnimatePresence>
        <motion.button
          key="floating-products"
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1,   y: 0  }}
          exit={{    opacity: 0, scale: 0.8, y: 16  }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          onClick={() => navigate(productsRoute)}
          aria-label="Go to Products"
          className="fixed z-40 flex items-center gap-2
            pl-3 pr-4 h-12 rounded-full
            bg-indigo-600 hover:bg-indigo-700 active:scale-95
            shadow-lg shadow-indigo-300/40
            transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-indigo-300"
          style={POSITION_STYLE}
        >
          <ShoppingBag size={18} className="text-white shrink-0" />
          <span className="text-white text-xs font-bold tracking-wide">Products</span>
        </motion.button>
      </AnimatePresence>
    );
  }

  // ── On product pages: show cart button ───────────────────────────────────
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
          className="fixed z-40 flex items-center gap-2
            pl-3 pr-4 h-12 rounded-full
            bg-indigo-600 hover:bg-indigo-700 active:scale-95
            shadow-lg shadow-indigo-300/40
            transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-indigo-300"
          style={POSITION_STYLE}
        >
          <motion.div
            animate={bounce ? { y: [-3, 0, -2, 0] } : { y: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative"
          >
            <ShoppingCart size={18} className="text-white" />
            {/* Count badge */}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={cartCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{    scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="absolute -top-2 -right-2
                  min-w-[17px] h-[17px] px-1
                  bg-red-500 text-white
                  text-[9px] font-bold rounded-full
                  flex items-center justify-center
                  border border-white pointer-events-none"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </motion.span>
            </AnimatePresence>
          </motion.div>
          <span className="text-white text-xs font-bold tracking-wide">Cart</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default React.memo(FloatingCartButton);
