// src/context/ThemeContext.jsx
//
// globalTheme  — admin-chosen palette, applies to all users via data-theme on <html>
// personalMode — per-user light/dark, stored in localStorage, toggles "dark" class
//                on <html> so Tailwind's dark: variant works app-wide automatically.

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "./AuthContext";

export const GLOBAL_THEMES = [
  { id: "default", label: "Default", color: "#4f46e5", description: "Clean slate — the classic indigo look" },
  { id: "ocean",   label: "Ocean",   color: "#0891b2", description: "Deep teal tones, calm and professional" },
  { id: "forest",  label: "Forest",  color: "#16a34a", description: "Earthy green, fresh and natural" },
  { id: "royal",   label: "Royal",   color: "#7c3aed", description: "Rich violet, bold and distinguished" },
  { id: "sunset",  label: "Sunset",  color: "#ea580c", description: "Warm amber, energetic and inviting" },
];

export const PERSONAL_MODES = [
  { id: "light", label: "Light", icon: "☀️", description: "Bright background, easy on the eyes in daytime" },
  { id: "dark",  label: "Dark",  icon: "🌙", description: "Dark background, reduces eye strain at night" },
];

const GLOBAL_THEME_KEY = "melech-global-theme";
const modeKey = (userId) => `melech-mode-${userId || "guest"}`;

const safeGet = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const safeSet = (key, val) => {
  try { localStorage.setItem(key, val); } catch {}
};

// Apply theme to <html> data-theme and toggle Tailwind "dark" class
const applyToDOM = (theme, mode) => {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme || "default");
  if (mode === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();

  const [globalTheme, setGlobalThemeState] = useState(
    () => safeGet(GLOBAL_THEME_KEY, "default")
  );
  const [personalMode, setPersonalModeState] = useState(
    () => safeGet(modeKey(user?._id || user?.id), "light")
  );

  // Apply on every change
  useEffect(() => {
    applyToDOM(globalTheme, personalMode);
  }, [globalTheme, personalMode]);

  // Fetch admin's saved global theme on mount (public endpoint, no auth)
  useEffect(() => {
    axiosInstance.get("/settings/theme")
      .then((res) => {
        const t = res.data?.globalTheme;
        if (t && t !== globalTheme) {
          safeSet(GLOBAL_THEME_KEY, t);
          setGlobalThemeState(t);
        }
      })
      .catch(() => {});
  }, []);

  // Re-load personal mode when user changes (login / logout)
  useEffect(() => {
    const uid = user?._id || user?.id;
    const saved = safeGet(modeKey(uid), "light");
    setPersonalModeState(saved);
    applyToDOM(globalTheme, saved);
  }, [user]);

  // Admin: save global theme to server + localStorage
  const setGlobalTheme = useCallback(async (theme) => {
    safeSet(GLOBAL_THEME_KEY, theme);
    setGlobalThemeState(theme);
    applyToDOM(theme, personalMode);
    try { await axiosInstance.put("/settings", { globalTheme: theme }); } catch {}
  }, [personalMode]);

  // Any user: toggle personal mode (localStorage only, no server)
  const setPersonalMode = useCallback((mode) => {
    const uid = user?._id || user?.id;
    safeSet(modeKey(uid), mode);
    setPersonalModeState(mode);
    applyToDOM(globalTheme, mode);
  }, [globalTheme, user]);

  return (
    <ThemeContext.Provider value={{
      globalTheme, personalMode,
      setGlobalTheme, setPersonalMode,
      GLOBAL_THEMES, PERSONAL_MODES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
