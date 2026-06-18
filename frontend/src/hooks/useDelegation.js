// src/hooks/useDelegation.js
//
// Fetches and caches the current staff user's delegation status.
// Returns { isDelegated, loading, refresh }.
//
// - Fires once on mount for staff users.
// - Listens for the custom "delegationChanged" browser event so the Sidebar
//   can update immediately when delegation is granted/revoked without a page reload.
// - Non-staff users always get { isDelegated: false, loading: false }.

import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";

export const useDelegation = () => {
  const { user } = useAuth();
  const [isDelegated, setIsDelegated] = useState(false);
  const [loading,     setLoading]     = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user || user.role !== "staff") {
      setIsDelegated(false);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axiosInstance.get("/settings/my-delegation");
      if (res.data.success) {
        setIsDelegated(res.data.isDelegated ?? false);
      }
    } catch {
      // Fail silently — default to no access
      setIsDelegated(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Re-fetch when admin changes delegation settings (fired from SettingsPage)
  useEffect(() => {
    const handler = () => fetchStatus();
    window.addEventListener("delegationChanged", handler);
    return () => window.removeEventListener("delegationChanged", handler);
  }, [fetchStatus]);

  return { isDelegated, loading, refresh: fetchStatus };
};
