import React, { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

/**
 * PullToRefresh
 * ─────────────
 * Wraps the main scroll container and listens for a downward touch drag.
 * Works even when the user starts pulling from the middle of the page.
 *
 * Props:
 *   scrollContainerId  — id of the scrollable element (default "main-scroll")
 *   onRefresh          — async function to call when user pulls down enough
 *   threshold          — how many px to pull before triggering (default 72)
 */

const THRESHOLD      = 72;   // px pulled before release triggers refresh
const MAX_PULL       = 110;  // max visual travel distance
const SCROLL_ID      = "main-scroll";

const PullToRefresh = ({ onRefresh, scrollContainerId = SCROLL_ID }) => {
  const [pullY,      setPullY]      = useState(0);   // 0 → MAX_PULL visual drag
  const [refreshing, setRefreshing] = useState(false);
  const [ready,      setReady]      = useState(false); // threshold crossed

  const startYRef    = useRef(null);
  const pullingRef   = useRef(false);
  const containerRef = useRef(null);

  const getContainer = useCallback(() =>
    containerRef.current || document.getElementById(scrollContainerId),
  [scrollContainerId]);

  // ── Touch start ──────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    if (refreshing) return;
    const el = getContainer();
    // Allow pull from anywhere — not just the top
    startYRef.current  = e.touches[0].clientY;
    pullingRef.current = true;
    // Store the scroll position at the moment of touch
    containerRef.current = el;
  }, [refreshing, getContainer]);

  // ── Touch move ───────────────────────────────────────────────────────────
  const onTouchMove = useCallback((e) => {
    if (!pullingRef.current || refreshing) return;
    const el = getContainer();
    if (!el) return;

    const deltaY = e.touches[0].clientY - startYRef.current;

    // Only activate if dragging DOWN and container is at the top
    if (deltaY <= 0 || el.scrollTop > 0) {
      pullingRef.current = false;
      setPullY(0);
      setReady(false);
      return;
    }

    // Rubber-band resistance — slower drag as it extends
    const resistance = 0.45;
    const travel = Math.min(deltaY * resistance, MAX_PULL);
    setPullY(travel);
    setReady(travel >= THRESHOLD);

    // Prevent the browser's native pull-to-refresh from fighting us
    if (travel > 8) {
      try { e.preventDefault(); } catch {}
    }
  }, [refreshing, getContainer]);

  // ── Touch end ────────────────────────────────────────────────────────────
  const onTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (ready && !refreshing) {
      setRefreshing(true);
      setPullY(48); // snap to spinner height
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPullY(0);
        setReady(false);
      }
    } else {
      setPullY(0);
      setReady(false);
    }
  }, [ready, refreshing, onRefresh]);

  // ── Attach listeners to the scroll container ─────────────────────────────
  useEffect(() => {
    const el = document.getElementById(scrollContainerId);
    if (!el) return;

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, scrollContainerId]);

  // ── Nothing to render when not pulling ───────────────────────────────────
  if (pullY <= 0 && !refreshing) return null;

  const progress = Math.min(pullY / THRESHOLD, 1); // 0 → 1

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center
        pointer-events-none"
      style={{
        height: `${Math.max(pullY, refreshing ? 48 : 0)}px`,
        transition: refreshing || pullY === 0 ? "height 0.25s ease" : "none",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))",
      }}
    >
      <div
        className="flex flex-col items-center gap-1"
        style={{
          opacity:   progress,
          transform: `scale(${0.6 + 0.4 * progress})`,
          transition: refreshing ? "none" : "opacity 0.1s, transform 0.1s",
        }}
      >
        <RefreshCw
          size={22}
          strokeWidth={2.2}
          className={`${ready ? "text-indigo-600" : "text-gray-400"} transition-colors`}
          style={{
            transform:  refreshing ? undefined : `rotate(${progress * 180}deg)`,
            animation:  refreshing ? "spin 0.7s linear infinite" : "none",
          }}
        />
        <span className="text-[10px] font-semibold text-gray-400">
          {refreshing ? "Refreshing…" : ready ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PullToRefresh;
