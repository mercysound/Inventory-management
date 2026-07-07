// src/hooks/useEngagementTracker.js
//
// Tracks customer engagement events during a session and sends them to the
// backend engagement API. Used on product pages and cart/checkout pages.
//
// How it works:
//   1. On mount: generates a sessionId (UUID-like) and calls POST /engagement/session/start
//   2. Exposes trackAction(action, productId?) — call this on engagement events
//   3. On unmount (or after 30 min inactivity): calls POST /engagement/session/end
//   4. On purchase complete: call markPurchased(totalSpent, cartItems)
//
// Tracked actions:
//   "product_view"    — user viewed a product detail for > 10 seconds
//   "add_to_cart"     — user added an item to cart
//   "start_checkout"  — user opened the Paystack/payment flow
//
// Only runs for customer and wholesale roles (staff/admin are excluded).

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";

const TRACKED_ROLES  = ["customer", "wholesale"];
const INACTIVITY_MS  = 30 * 60 * 1000; // 30 minutes

// Generate a lightweight session ID
const makeSessionId = () =>
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useEngagementTracker = () => {
  const { user } = useAuth();
  const sessionId       = useRef(null);
  const started         = useRef(false);
  const inactivityTimer = useRef(null);
  const purchased       = useRef(false);
  const cartSnapshot    = useRef([]);
  const totalSpentRef   = useRef(0);

  const isTracked = user && TRACKED_ROLES.includes(user.role);

  // ── End session — declared FIRST so all later functions can reference it ──
  const endSession = useCallback(() => {
    if (!sessionId.current || !started.current) return;
    clearTimeout(inactivityTimer.current);
    axiosInstance.post("/engagement/session/end", {
      sessionId:  sessionId.current,
      purchased:  purchased.current,
      totalSpent: totalSpentRef.current,
      cartItems:  cartSnapshot.current,
    }).catch(() => {});
    started.current = false;
  }, []);

  // ── Reset inactivity timer ────────────────────────────────────────────────
  const resetInactivity = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(endSession, INACTIVITY_MS);
  }, [endSession]);

  // ── Start session once on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!isTracked || started.current) return;
    sessionId.current = makeSessionId();
    started.current   = true;
    axiosInstance.post("/engagement/session/start", {
      sessionId: sessionId.current,
    }).catch(() => {});
    return () => { endSession(); };
  }, [isTracked, endSession]); // endSession is stable (empty deps useCallback)

  // ── Track a single engagement action ─────────────────────────────────────
  const trackAction = useCallback((action, productId = null) => {
    if (!isTracked || !sessionId.current) return;
    resetInactivity();

    axiosInstance.post("/engagement/session/action", {
      sessionId: sessionId.current,
      action,
      ...(productId ? { productId } : {}),
    }).catch(() => {});
  }, [isTracked, resetInactivity]);

  // ── Mark order as purchased ───────────────────────────────────────────────
  const markPurchased = useCallback((totalSpent = 0, cartItems = []) => {
    if (!isTracked || !sessionId.current) return;
    purchased.current    = true;
    totalSpentRef.current = totalSpent;
    cartSnapshot.current  = cartItems;

    // End session immediately after purchase
    endSession();
  }, [isTracked, endSession]);

  // ── Update cart snapshot (called when cart changes) ───────────────────────
  const updateCart = useCallback((cartItems = [], total = 0) => {
    cartSnapshot.current  = cartItems;
    totalSpentRef.current = total;
  }, []);

  return { trackAction, markPurchased, updateCart };
};
