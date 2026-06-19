// src/pages/UserSettingsPage.jsx
// Personal settings page for staff, customer and wholesale users.
// Lets each user control their own dark/light mode preference.
// The global brand theme is admin-controlled — users can only see what's active.

import React from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Palette, CheckCircle2 } from "lucide-react";
import { useTheme, GLOBAL_THEMES, PERSONAL_MODES } from "../context/ThemeContext";

const UserSettingsPage = () => {
  const { globalTheme, personalMode, setPersonalMode } = useTheme();

  const activeTheme = GLOBAL_THEMES.find((t) => t.id === globalTheme) || GLOBAL_THEMES[0];

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ My Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personalise how the app looks for you on this device.
        </p>
      </div>

      {/* ── Display mode ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
      >
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          {personalMode === "dark" ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-400" />}
          Display Mode
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Choose between light and dark mode. This setting is personal to you and only affects your view.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {PERSONAL_MODES.map((m) => {
            const active = personalMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPersonalMode(m.id)}
                className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  active
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold flex items-center gap-2 ${active ? "text-indigo-700" : "text-gray-800"}`}>
                    {m.label}
                    {active && <CheckCircle2 size={14} className="text-indigo-500" />}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Active global theme (read-only) ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
      >
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Palette size={16} className="text-indigo-400" />
          Store Brand Theme
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          The brand colour palette is set by the store admin and applies to all users. You cannot change it here.
        </p>

        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <span
            className="w-10 h-10 rounded-xl shadow-sm shrink-0"
            style={{ background: activeTheme.color }}
          />
          <div>
            <p className="text-sm font-bold text-gray-800">{activeTheme.label} Theme</p>
            <p className="text-xs text-gray-400">{activeTheme.description}</p>
          </div>
          <span className="ml-auto text-[10px] font-semibold bg-green-100 text-green-700
            border border-green-200 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>
      </motion.div>

      {/* Note */}
      <p className="text-xs text-gray-400 text-center">
        Your display mode preference is saved on this device only.
      </p>
    </div>
  );
};

export default UserSettingsPage;
