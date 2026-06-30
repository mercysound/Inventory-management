// src/hooks/useWholesaleAccess.js
//
// Fetches and caches whether the current staff user is allowed to use
// wholesale pricing on walk-in sales.
// Returns { canUseWholesale, loading, refresh }.
//
// - Fires once on mount for staff users.
// - Listens for the custom "wholesaleAccessChanged" browser event so the
//   StaffOrders page updates immediately when admin changes the setting.
// - Non-staff users always get { canUseWholesale: false, loading: false }.

import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";

export const useWholesaleAccess = () => {
  const { user } = useAuth();
  const [canUseWholesale, setCanUseWholesale] = useState(false);
  const [loading,         setLoading]         = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user || user.role !== "staff") {
      setCanUseWholesale(false);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axiosInstance.get("/settings/my-wholesale");
      if (res.data.success) {
        setCanUseWholesale(res.data.canUseWholesale ?? false);
      }
    } catch {
      setCanUseWholesale(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Re-fetch when admin changes wholesale access settings
  useEffect(() => {
    const handler = () => fetchStatus();
    window.addEventListener("wholesaleAccessChanged", handler);
    return () => window.removeEventListener("wholesaleAccessChanged", handler);
  }, [fetchStatus]);

  return { canUseWholesale, loading, refresh: fetchStatus };
};
