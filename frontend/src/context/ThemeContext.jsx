// src/context/ThemeContext.jsx
//
// Manages two independent settings:
//
//  globalTheme  — the brand palette chosen by the admin.
//                 Applies to ALL users. Stored in:
//                   - localStorage "melech-global-theme" (instant, no API needed for read)
//                   - server Settings.globalTheme (admin saves via API; others read via /settings/theme)
//
//  personalMode — the user's own light/dark preference.
//                 Never shared; stored only in localStorage under a per-user key.
//
// Both are applied as data-attributes on <html>:
//   <html data-theme="ocean" data-mode="dark">
// CSS in index.css reads those and swaps custom properties accordingly.

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "./AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────
export const GLOBAL_THEMES = [
  { id: "default", label: "Default",  color: "#4f46e5", description: "Clean slate — the classic indigo look" },
  { id: "ocean",   label: "Ocean",    color: "#0891b2", description: "Deep teal tones, calm and professional" },
  { id: "forest",  label: "Forest",   color: "#16a34a", description: "Earthy green, fresh and natural" },
  { id: "royal",   label: "Royal",    color: "#7c3aed", description: "Rich violet, bold and distinguished" },
  { id: "sunset",  label: "Sunset",   color: "#ea580c", description: "Warm amber, energetic and inviting" },
];

export const PERSONAL_MODES = [
  { id: "light", label: "Light",  icon: "☀️", description: "Bright background, easy on the eyes in daytime" },
  { id: "dark",  label: "Dark",   icon: "🌙", description: "Dark background, reduces eye strain at night" },
];

const GLOBAL_THEME_KEY = "melech-global-theme";
const modeKeyForUser   = (userId) => `melech-mode-${userId || "guest"}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const applyToDOM = (theme, mode) => {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme || "default");
  html.setAttribute("data-mode",  mode  || "light");
};

const safeGet = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v || fallback; }
  catch { return fallback; }
};

const safeSet = (key, val) => {
  try { localStorage.setItem(key, val); } catch {}
};

// ── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();

  // Load persisted values synchronously before first render
  const [globalTheme, setGlobalThemeState] = useState(
    () => safeGet(GLOBAL_THEME_KEY, "default")
  );
  const [personalMode, setPersonalModeState] = useState(
    () => safeGet(modeKeyForUser(user?._id || user?.id), "light")
  );

  // ── Sync both to DOM whenever they change ─────────────────────────────────
  useEffect(() => {
    applyToDOM(globalTheme, personalMode);
  }, [globalTheme, personalMode]);

  // ── On mount: fetch the admin-controlled global theme from the server ──────
  // Non-admin users don't have access to /settings, so we hit a lightweight
  // public endpoint /settings/theme instead (no auth restriction).
  useEffect(() => {
    axiosInstance
      .get("/settings/theme")
      .then((res) => {
        const serverTheme = res.data?.globalTheme;
        if (serverTheme && serverTheme !== globalTheme) {
          safeSet(GLOBAL_THEME_KEY, serverTheme);
          setGlobalThemeState(serverTheme);
        }
      })
      .catch(() => { /* silently fall back to localStorage value */ });
  }, []); // once on mount

  // ── When user changes (login/logout) re-load their personal mode ──────────
  useEffect(() => {
    const userId   = user?._id || user?.id;
    const modeKey  = modeKeyForUser(userId);
    const saved    = safeGet(modeKey, "light");
    setPersonalModeState(saved);
    applyToDOM(globalTheme, saved);
  }, [user]);

  // ── Admin: change global theme (saves to server + localStorage) ───────────
  const setGlobalTheme = useCallback(async (theme) => {
    safeSet(GLOBAL_THEME_KEY, theme);
    setGlobalThemeState(theme);
    applyToDOM(theme, personalMode);
    // Persist to server so all users get it on next load
    try {
      await axiosInstance.put("/settings", { globalTheme: theme });
    } catch (err) {
      console.error("Failed to save global theme to server:", err.message);
    }
  }, [personalMode]);

  // ── Any user: change personal mode (localStorage only) ───────────────────
  const setPersonalMode = useCallback((mode) => {
    const userId  = user?._id || user?.id;
    const modeKey = modeKeyForUser(userId);
    safeSet(modeKey, mode);
    setPersonalModeState(mode);
    applyToDOM(globalTheme, mode);
  }, [globalTheme, user]);

  return (
    <ThemeContext.Provider value={{
      globalTheme,
      personalMode,
      setGlobalTheme,
      setPersonalMode,
      GLOBAL_THEMES,
      PERSONAL_MODES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
