import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

const APPEAR_THRESHOLD  = 200;
const BOTTOM_THRESHOLD  = 200;
const HIDE_WHILE_SCROLL = 600;
const CONTAINER_ID      = "main-scroll";

// Cart/Products pages — cart button is visible on these
const CART_ROUTES = [
  "/user-dashboard/orders",
  "/wholesale-dashboard/orders",
  "/customer-dashboard/orders",
];

const FloatingScrollButtons = () => {
  const { user }      = useAuth();
  const { cartCount, hasCart } = useCart();
  const location      = useLocation();

  const [showUp,    setShowUp]    = useState(false);
  const [showDown,  setShowDown]  = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const hideTimerRef = useRef(null);
  const rafRef       = useRef(null);

  // Is the cart/products floating button currently visible on screen?
  const isCartPage     = CART_ROUTES.some((r) => location.pathname === r);
  const cartBtnVisible =
    hasCart &&
    user?.role !== "admin" &&
    (isCartPage || cartCount > 0); // products page shows cart when items added

  // Scroll buttons sit above the cart button when it's visible
  // cart pill height 48px + gap 12px + base 24px = 84 → use 96px to be safe
  const bottomOffset = cartBtnVisible
    ? "max(100px, calc(env(safe-area-inset-bottom, 0px) + 100px))"
    : "max(88px, calc(env(safe-area-inset-bottom, 0px) + 88px))";

  const evaluate = useCallback((target) => {
    let scrollTop, scrollHeight, clientHeight;
    if (!target || target === window) {
      scrollTop    = window.scrollY;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    } else {
      scrollTop    = target.scrollTop;
      scrollHeight = target.scrollHeight;
      clientHeight = target.clientHeight;
    }
    const hasScroll  = scrollHeight > clientHeight + 20;
    const nearTop    = scrollTop < APPEAR_THRESHOLD;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - BOTTOM_THRESHOLD;
    setShowUp  (hasScroll && !nearTop);
    setShowDown(hasScroll && !nearBottom);
  }, []);

  const onScroll = useCallback(() => {
    setScrolling(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setScrolling(false);
      const target = document.getElementById(CONTAINER_ID) || window;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => evaluate(target));
    }, HIDE_WHILE_SCROLL);
  }, [evaluate]);

  useEffect(() => {
    let container = document.getElementById(CONTAINER_ID);
    const attach = (el) => {
      el.addEventListener("scroll", onScroll, { passive: true });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => evaluate(el));
    };
    if (container) {
      attach(container);
    } else {
      const t = setTimeout(() => {
        container = document.getElementById(CONTAINER_ID);
        if (container) attach(container);
      }, 200);
      return () => clearTimeout(t);
    }
    return () => {
      if (container) container.removeEventListener("scroll", onScroll);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (rafRef.current)       cancelAnimationFrame(rafRef.current);
    };
  }, [onScroll, evaluate]);

  const scrollTo = useCallback((direction) => {
    const target = document.getElementById(CONTAINER_ID);
    const top    = direction === "top" ? 0 : 999999;
    if (target) target.scrollTo({ top, behavior: "smooth" });
    else window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const upVisible   = showUp   && !scrolling;
  const downVisible = showDown && !scrolling;

  const btnClass = `
    w-9 h-9 rounded-full flex items-center justify-center
    bg-white/90 backdrop-blur-sm
    border border-gray-200
    text-gray-500 hover:text-gray-800 hover:bg-white hover:border-gray-300
    shadow-md shadow-gray-200/60
    transition-all active:scale-90
    focus:outline-none focus:ring-2 focus:ring-indigo-300
  `.trim();

  return (
    <motion.div
      className="fixed z-39 flex flex-col gap-1.5 pointer-events-none"
      animate={{ bottom: cartBtnVisible ? 100 : 88 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        right: "max(16px, calc(env(safe-area-inset-right, 0px) + 16px))",
      }}
    >
      <AnimatePresence>
        {upVisible && (
          <motion.button
            key="scroll-up"
            initial={{ opacity: 0, scale: 0.7, y: 6 }}
            animate={{ opacity: 1, scale: 1,   y: 0 }}
            exit={{    opacity: 0, scale: 0.7, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={() => scrollTo("top")}
            aria-label="Scroll to top"
            className={btnClass}
            style={{ pointerEvents: "auto" }}
          >
            <ChevronUp size={16} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {downVisible && (
          <motion.button
            key="scroll-down"
            initial={{ opacity: 0, scale: 0.7, y: -6 }}
            animate={{ opacity: 1, scale: 1,   y: 0  }}
            exit={{    opacity: 0, scale: 0.7, y: -6  }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={() => scrollTo("bottom")}
            aria-label="Scroll to bottom"
            className={btnClass}
            style={{ pointerEvents: "auto" }}
          >
            <ChevronDown size={16} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FloatingScrollButtons;
