// src/hooks/useFavorites.js
// Manages favorites state for both logged-in users (server-backed) and guests
// (localStorage). On login, guest favorites are synced to the server.

import { useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "../utils/axiosInstance";

const LS_KEY = "melech_guest_favorites"; // array of productIds

// ── localStorage helpers ──────────────────────────────────────────────────────
const readGuestFavs   = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
const writeGuestFavs  = (ids) => { try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch {} };

export const useFavorites = (user) => {
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const synced = useRef(false);

  // ── Load favorites ─────────────────────────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    if (!user) {
      // Guest: read from localStorage
      setFavoriteIds(readGuestFavs());
      return;
    }
    try {
      setLoading(true);
      const res = await axiosInstance.get("/favorites/ids");
      if (res.data.success) setFavoriteIds(res.data.ids || []);
    } catch {
      // Fallback to empty
      setFavoriteIds([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // ── Sync guest favorites to server after login ─────────────────────────────
  useEffect(() => {
    if (!user || synced.current) return;
    synced.current = true;
    const guestIds = readGuestFavs();
    if (guestIds.length > 0) {
      axiosInstance.post("/favorites/sync", { productIds: guestIds })
        .then(() => {
          writeGuestFavs([]); // clear local after sync
          loadFavorites();    // refresh from server
        })
        .catch(() => {});
    }
  }, [user, loadFavorites]);

  // ── Toggle a favorite ──────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (productId) => {
    const isFav = favoriteIds.includes(productId);

    if (!user) {
      // Guest: update localStorage
      const next = isFav
        ? favoriteIds.filter(id => id !== productId)
        : [...favoriteIds, productId];
      setFavoriteIds(next);
      writeGuestFavs(next);
      return !isFav;
    }

    // Optimistic update
    setFavoriteIds(prev =>
      isFav ? prev.filter(id => id !== productId) : [...prev, productId]
    );

    try {
      const res = await axiosInstance.post(`/favorites/${productId}`);
      // Reconcile with server response
      const serverFav = res.data.favorited;
      setFavoriteIds(prev =>
        serverFav
          ? prev.includes(productId) ? prev : [...prev, productId]
          : prev.filter(id => id !== productId)
      );
      return serverFav;
    } catch {
      // Rollback
      setFavoriteIds(prev =>
        isFav ? [...prev, productId] : prev.filter(id => id !== productId)
      );
      return isFav;
    }
  }, [user, favoriteIds]);

  const isFavorite = useCallback((productId) => favoriteIds.includes(productId), [favoriteIds]);

  return { favoriteIds, isFavorite, toggleFavorite, loading, refresh: loadFavorites };
};
