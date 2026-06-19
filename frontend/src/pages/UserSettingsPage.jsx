import React from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Palette, CheckCircle2, Settings2 } from "lucide-react";
import { useTheme, GLOBAL_THEMES, PERSONAL_MODES } from "../context/ThemeContext";

const UserSettingsPage = () => {
  const { globalTheme, personalMode, setPersonalMode } = useTheme();
  const activeTheme = GLOBAL_THEMES.find((t) => t.id === globalTheme) || GLOBAL_THEMES[0];

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings2 size={22} className="text-indigo-500" /> My Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Personalise how the app looks for you on this device.
        </p>
      </div>

      {/* Display Mode */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          {personalMode === "dark"
            ? <Moon size={16} className="text-indigo-400" />
            : <Sun size={16} className="text-amber-400" />}
          Display Mode
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Choose between light and dark mode. This setting is personal to you and only affects your view.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {PERSONAL_MODES.map((m) => {
            const active = personalMode === m.id;
            return (
              <button key={m.id} type="button" onClick={() => setPersonalMode(m.id)}
                className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  active
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-900"
                }`}>
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold flex items-center gap-2 ${active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200"}`}>
                    {m.label}
                    {active && <CheckCircle2 size={14} className="text-indigo-500" />}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Active Global Theme (read-only) */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <Palette size={16} className="text-indigo-400" /> Store Brand Theme
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          The brand colour palette is set by the store admin and applies to all users. You cannot change it here.
        </p>
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3">
          <span className="w-10 h-10 rounded-xl shadow-sm shrink-0" style={{ background: activeTheme.color }} />
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{activeTheme.label} Theme</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{activeTheme.description}</p>
          </div>
          <span className="ml-auto text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>
      </motion.div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Your display mode preference is saved on this device only.
      </p>
    </div>
  );
};

export default UserSettingsPage;
