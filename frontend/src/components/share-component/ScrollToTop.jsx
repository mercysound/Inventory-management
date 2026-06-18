// ScrollToTop — appears after 300 px of scroll inside the main content area.
// Behaviour:
//   • Fully transparent (ghost) when idle so underlying text is still readable
//   • Fades out while the user is actively scrolling, reappears when they stop
//   • Small, stays bottom-right above the floating cart button
//   • No distracting colours — just a subtle outline circle with an up arrow

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";

const SCROLL_THRESHOLD  = 300;  // px before button first appears
const HIDE_WHILE_SCROLL = 600;  // ms after last scroll event before reappearing
const CONTAINER_ID      = "main-scroll";

const ScrollToTop = () => {
  const [pastThreshold, setPastThreshold] = useState(false); // crossed 300 px?
  const [scrolling,     setScrolling]     = useState(false); // actively scrolling?
  const hideTimerRef = useRef(null);

  const onScroll = useCallback((e) => {
    const top = e?.target?.scrollTop ?? 0;
    setPastThreshold(top > SCROLL_THRESHOLD);

    // Hide while scrolling
    setScrolling(true);

    // Reset the "scrolling stopped" timer on every scroll event
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setScrolling(false);
    }, HIDE_WHILE_SCROLL);
  }, []);

  useEffect(() => {
    let container = document.getElementById(CONTAINER_ID);

    if (!container) {
      const timer = setTimeout(() => {
        container = document.getElementById(CONTAINER_ID);
        if (container) container.addEventListener("scroll", onScroll, { passive: true });
      }, 200);
      return () => clearTimeout(timer);
    }

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [onScroll]);

  const scrollUp = () => {
    const container = document.getElementById(CONTAINER_ID);
    if (container) container.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Show only when: past threshold AND not currently scrolling
  const show = pastThreshold && !scrolling;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="scroll-to-top"
          onClick={scrollUp}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1   }}
          exit={{    opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          aria-label="Back to top"
          title="Back to top"
          style={{
            position:  "fixed",
            bottom:    "88px",  // above floating cart button
            right:     "18px",
            zIndex:    39,      // one below cart button (z-40)
            width:     38,
            height:    38,
            borderRadius: "50%",
            // Ghost / transparent — readable over any background
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1.5px solid rgba(100,116,139,0.35)", // subtle slate outline
            color: "rgba(100,116,139,0.85)",              // slate-500 icon
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 8px rgba(0,0,0,.10)",
            WebkitTapHighlightColor: "transparent",
            // Hover brightness handled inline for no-CSS approach
          }}
          whileHover={{
            background: "rgba(15,23,42,0.72)",
            color: "#f1f5f9",
            border: "1.5px solid rgba(255,255,255,0.15)",
            boxShadow: "0 4px 16px rgba(0,0,0,.22)",
          }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronUp size={17} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
