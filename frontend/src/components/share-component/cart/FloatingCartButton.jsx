// src/components/share-component/cart/FloatingCartButton.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";

// Pages where the floating button should NOT appear
// (the cart page itself — no need to link to the page you're already on)
const CART_ROUTES = [
  "/user-dashboard/orders",
  "/wholesale-dashboard/orders",
  "/customer-dashboard/orders",
];

const FloatingCartButton = () => {
  const { user }              = useAuth();
  const navigate              = useNavigate();
  const location              = useLocation();
  const { cartCount, cartPath, hasCart } = useCart();
  
  const [bounce, setBounce]   = useState(false);
  const [prevCount, setPrevCount] = useState(cartCount);
  const [hidden, setHidden] = useState(false);
  const hideCounterRef = useRef(0);
  const modalOpenRef = useRef(false);
  const [pos, setPos] = useState({ bottom: 24, right: 24 });

  // Trigger bounce animation when cart count increases
  useEffect(() => {
    if (cartCount > prevCount) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 700);
      setPrevCount(cartCount);
      return () => clearTimeout(t);
    }
    setPrevCount(cartCount);
  }, [cartCount]);

  // Listen for modal visibility events to hide button while modal is open
  useEffect(() => {
    const handler = (e) => {
      const open = !!e?.detail?.open;
      modalOpenRef.current = open;
      setHidden(open || hideCounterRef.current > 0);
    };
    const hoverHandler = (e) => {
      const hide = !!e?.detail?.hide;
      if (hide) {
        hideCounterRef.current += 1;
      } else {
        hideCounterRef.current = Math.max(0, hideCounterRef.current - 1);
      }
      setHidden(modalOpenRef.current || hideCounterRef.current > 0);
    };

    window.addEventListener("modalVisibility", handler);
    window.addEventListener("hideFloatingCart", hoverHandler);
    return () => {
      window.removeEventListener("modalVisibility", handler);
      window.removeEventListener("hideFloatingCart", hoverHandler);
    };
  }, []);

  // Responsive position updater (declare before any early returns)
  useEffect(() => {
    const updatePos = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setPos({ bottom: 100, right: 16 });
      } else if (w < 1024) {
        setPos({ bottom: 40, right: 20 });
      } else {
        setPos({ bottom: 24, right: 24 });
      }
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, []);

  // ── Early exits (AFTER all hooks) ──────────────────────────────────────────
  if (!user || user.role === "admin" || !hasCart) return null;

  const isCartPage = CART_ROUTES.some((route) => location.pathname === route);
  if (isCartPage || hidden) return null;

  

  return (
    <AnimatePresence>
      {/* Only show when there are items in the cart */}
      {cartCount > 0 && (
        <motion.button
          key="floating-cart"
          initial={{ opacity: 0, scale: 0, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          onClick={() => navigate(cartPath)}
          aria-label={`View cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}`}
          className="fixed z-50 flex items-center justify-center
            w-14 h-14 rounded-full
            bg-indigo-600 hover:bg-indigo-700 active:scale-95
            shadow-lg shadow-indigo-300/50
            transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-indigo-300"
          style={{ WebkitTapHighlightColor: "transparent", bottom: pos.bottom, right: pos.right, position: 'fixed' }}
        >
          {/* Cart icon with bounce */}
          <motion.div
            animate={bounce ? { y: [-4, 0, -3, 0] } : { y: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <ShoppingCart size={22} className="text-white" />
          </motion.div>

          {/* Count badge */}
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="absolute -top-1 -right-1
                  min-w-[22px] h-[22px] px-1.5
                  bg-red-500 text-white
                  text-[11px] font-bold rounded-full
                  flex items-center justify-center
                  shadow-md border-2 border-white"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default React.memo(FloatingCartButton);
