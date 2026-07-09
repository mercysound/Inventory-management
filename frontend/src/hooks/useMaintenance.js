// src/hooks/useMaintenance.js
// Connects to the SSE maintenance stream and listens for maintenance mode
// events. When maintenance starts, calls onMaintenance(message).
// When it ends, calls onMaintenanceEnded().
// Also polls GET /settings/maintenance-status on mount for current state.

import { useEffect, useRef } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const useMaintenance = ({ onMaintenance, onMaintenanceEnded } = {}) => {
  const esRef = useRef(null);

  useEffect(() => {
    // Connect SSE stream (no auth needed — public endpoint)
    const es = new EventSource(`${BASE_URL}/maintenance/stream`);
    esRef.current = es;

    es.addEventListener("maintenanceStarted", (e) => {
      try {
        const { message } = JSON.parse(e.data);
        onMaintenance?.(message || "We are performing scheduled maintenance. We'll be back shortly.");
      } catch {}
    });

    es.addEventListener("maintenanceEnded", () => {
      onMaintenanceEnded?.();
    });

    es.addEventListener("error", () => {
      // Silently reconnect — browser handles EventSource reconnect automatically
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
