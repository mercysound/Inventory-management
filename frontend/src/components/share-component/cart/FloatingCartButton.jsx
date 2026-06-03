// src/components/share-component/cart/FloatingCartButton.jsx
import React, { useEffect, useState } from "react";
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
  const { cartCount, cartPath, hasCart } = useCart();
  const navigate              = useNavigate();
  const location              = useLocation();
  const [bounce, setBounce]   = useState(false);
  const [prevCount, setPrevCount] = useState(cartCount);

  // Admin does NOT get a floating cart button
  if (!user || user.role === "admin" || !hasCart) return null;

  // Hide on the cart page itself
  const isCartPage = CART_ROUTES.some((route) => location.pathname === route);
  if (isCartPage) return null;

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
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center
            w-14 h-14 rounded-full
            bg-indigo-600 hover:bg-indigo-700 active:scale-95
            shadow-lg shadow-indigo-300/50
            transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-indigo-300"
          style={{ WebkitTapHighlightColor: "transparent" }}
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

export default FloatingCartButton;
