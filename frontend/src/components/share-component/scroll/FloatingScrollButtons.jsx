import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";

/**
 * FloatingScrollButtons
 * ─────────────────────
 * ↑ scroll-to-top   — appears only when scrolled down enough that jumping up is useful
 * ↓ scroll-to-bottom — appears only when there is meaningful content still below
 *
 * Both buttons:
 *   • HIDE while the user is actively scrolling (no clutter during scroll)
 *   • RE-APPEAR 600 ms after scrolling stops (the old ScrollToTop used the same delay)
 *   • Sit bottom-right above the floating cart / products button
 */

const APPEAR_THRESHOLD  = 200;   // px from top before ↑ button shows
const BOTTOM_THRESHOLD  = 200;   // px from bottom before ↓ button shows
const HIDE_WHILE_SCROLL = 600;   // ms after last scroll event before buttons reappear
const CONTAINER_ID      = "main-scroll"; // same id used by old ScrollToTop

const FloatingScrollButtons = () => {
  const [showUp,     setShowUp]     = useState(false);
  const [showDown,   setShowDown]   = useState(false);
  const [scrolling,  setScrolling]  = useState(false); // true while user is scrolling
  const hideTimerRef = useRef(null);
  const rafRef       = useRef(null);

  // ── Core position evaluator ──────────────────────────────────────────────
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

  // ── Scroll handler — hides during scroll, re-evaluates when stopped ──────
  const onScroll = useCallback((e) => {
    // Hide immediately while scrolling
    setScrolling(true);

    // Debounce: re-show and re-evaluate after user stops
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setScrolling(false);
      const target = document.getElementById(CONTAINER_ID) || window;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => evaluate(target));
    }, HIDE_WHILE_SCROLL);
  }, [evaluate]);

  // ── Attach scroll listener to the dashboard main scroller ───────────────
  useEffect(() => {
    let container = document.getElementById(CONTAINER_ID);

    const attach = (el) => {
      el.addEventListener("scroll", onScroll, { passive: true });
      // Initial evaluation
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => evaluate(el));
    };

    if (container) {
      attach(container);
    } else {
      // Wait for DOM to mount (e.g. after route change)
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

  // ── Scroll actions ───────────────────────────────────────────────────────
  const scrollTo = useCallback((direction) => {
    const target = document.getElementById(CONTAINER_ID);
    const top    = direction === "top" ? 0 : 999999;
    if (target) {
      target.scrollTo({ top, behavior: "smooth" });
    } else {
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  // Buttons are visible only when NOT actively scrolling and position warrants it
  const upVisible   = showUp   && !scrolling;
  const downVisible = showDown && !scrolling;

  const btnClass = `
    w-9 h-9 rounded-full flex items-center justify-center
    bg-white/80 backdrop-blur-sm
    border border-gray-200
    text-gray-500 hover:text-gray-800 hover:bg-white hover:border-gray-300
    shadow-md shadow-gray-200/60
    transition-colors active:scale-90
    focus:outline-none focus:ring-2 focus:ring-indigo-300
  `.trim();

  return (
    <div
      className="fixed z-39 flex flex-col gap-1.5 pointer-events-none"
      style={{
        bottom: "max(88px, calc(env(safe-area-inset-bottom, 0px) + 88px))",
        right:  "max(16px, calc(env(safe-area-inset-right,  0px) + 16px))",
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
    </div>
  );
};

export default FloatingScrollButtons;
