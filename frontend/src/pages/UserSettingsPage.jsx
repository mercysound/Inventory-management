// src/pages/UserSettingsPage.jsx
// Combined Account + Settings page for staff, customer, and wholesale users.
// Merges profile editing and display preferences into one clean page.

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Moon, Sun, Palette, CheckCircle2, Settings2,
  User, Mail, Phone, MapPin, Lock, Eye, EyeOff,
  Pencil, X, Save, Loader2, Calculator,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";
import { useTheme, GLOBAL_THEMES, PERSONAL_MODES } from "../context/ThemeContext";
import { isCalculatorEnabled, setCalculatorEnabled } from "../components/share-component/calculator/FloatingCalculator";

// ── Reusable labelled field ───────────────────────────────────────────────────
const Field = ({ label, icon: Icon, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
      {Icon && <Icon size={11} className="text-gray-400" />} {label}
    </label>
    {children}
  </div>
);

const inputCls = (disabled) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2
   focus:ring-indigo-300 transition-all
   ${disabled
     ? "bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
     : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
   }`;

// ── Password field — defined OUTSIDE component to prevent remount on every keystroke ──
// If defined inside, React treats it as a new type on every render → focus lost immediately
const PwdField = ({ label, field, show, setShow, pwdData, setPwdData }) => (
  <Field label={label} icon={Lock}>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder={`Enter ${label.toLowerCase()}`}
        value={pwdData[field]}
        onChange={(e) => setPwdData((p) => ({ ...p, [field]: e.target.value }))}
        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2
          focus:ring-indigo-300 transition-all pr-10
          bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600
          text-gray-800 dark:text-gray-200`}
        autoComplete={field === "oldPassword" ? "current-password" : "new-password"}
      />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
        tabIndex={-1}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </Field>
);

const UserSettingsPage = () => {
  const { globalTheme, personalMode, setPersonalMode } = useTheme();
  const activeTheme = GLOBAL_THEMES.find((t) => t.id === globalTheme) || GLOBAL_THEMES[0];

  // ── Calculator preference ─────────────────────────────────────────────────
  const [calcEnabled, setCalcEnabled] = useState(isCalculatorEnabled);

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profile,    setProfile]    = useState({ name: "", email: "", phone: "", address: "" });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editMode,   setEditMode]   = useState(false);
  const [saving,     setSaving]     = useState(false);

  // ── Password state ────────────────────────────────────────────────────────
  const [changePwd,  setChangePwd]  = useState(false);
  const [pwdData,    setPwdData]    = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOld,    setShowOld]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await axiosInstance.get("/users/profile");
      if (res.data.success) {
        const d = res.data._doc;
        setProfile({ name: d?.name || "", email: d?.email || "", phone: d?.phone || "", address: d?.address || "" });
      }
    } catch { toast.error("Failed to load profile"); }
    finally { setLoadingProfile(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (changePwd) {
      if (!pwdData.oldPassword) { toast.error("Enter your current password"); return; }
      if (!pwdData.newPassword)  { toast.error("Enter a new password"); return; }
      if (pwdData.newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }
      if (pwdData.newPassword !== pwdData.confirmPassword) { toast.error("Passwords do not match"); return; }
    }
    setSaving(true);
    try {
      const payload = { ...profile };
      if (changePwd) { payload.oldPassword = pwdData.oldPassword; payload.password = pwdData.newPassword; }
      const res = await axiosInstance.put("/users/profile", payload);
      if (res.data.success) {
        toast.success("Profile updated successfully");
        setEditMode(false); setChangePwd(false);
        setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else { toast.error("Failed to update profile"); }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error updating profile");
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setEditMode(false); setChangePwd(false);
    setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    fetchProfile();
  };

  // PwdField is defined outside this component (above) to prevent remount on keystroke

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings2 size={22} className="text-indigo-500" /> Account & Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your profile details and personalise the app.
        </p>
      </div>

      {/* ── Account / Profile ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <User size={16} className="text-indigo-500" /> My Account
          </h2>
          {!editMode && !loadingProfile && (
            <button onClick={() => setEditMode(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400
                hover:text-indigo-800 border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 rounded-lg transition">
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {loadingProfile ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
              <Loader2 size={16} className="animate-spin" /> Loading profile...
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name" icon={User}>
                  <input type="text" value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    disabled={!editMode} placeholder="Your name"
                    className={inputCls(!editMode)} />
                </Field>
                <Field label="Email" icon={Mail}>
                  <input type="email" value={profile.email} disabled
                    className={inputCls(true)} />
                  <p className="text-[10px] text-gray-400">Email cannot be changed</p>
                </Field>
                <Field label="Phone" icon={Phone}>
                  <input type="tel" value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    disabled={!editMode} placeholder="Phone number"
                    className={inputCls(!editMode)} />
                </Field>
                <Field label="Address" icon={MapPin}>
                  <input type="text" value={profile.address}
                    onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                    disabled={!editMode} placeholder="Your address"
                    className={inputCls(!editMode)} />
                </Field>
              </div>

              {/* Password change toggle */}
              {editMode && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button type="button" onClick={() => setChangePwd((p) => !p)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5">
                    <Lock size={13} />
                    {changePwd ? "Cancel password change" : "Change password"}
                  </button>
                  {changePwd && (
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <PwdField label="Current Password" field="oldPassword" show={showOld} setShow={setShowOld} pwdData={pwdData} setPwdData={setPwdData} />
                      <PwdField label="New Password"     field="newPassword" show={showNew} setShow={setShowNew} pwdData={pwdData} setPwdData={setPwdData} />
                      <PwdField label="Confirm Password" field="confirmPassword" show={showConf} setShow={setShowConf} pwdData={pwdData} setPwdData={setPwdData} />
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons — only visible in edit mode */}
              {editMode && (
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700
                      disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button type="button" onClick={handleCancel} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 dark:border-gray-600
                      text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <X size={14} /> Cancel
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </motion.div>

      {/* ── Display Mode ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          {personalMode === "dark" ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-400" />}
          Display Mode
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Personal preference — only affects your view.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {PERSONAL_MODES.map((m) => {
            const active = personalMode === m.id;
            return (
              <button key={m.id} type="button" onClick={() => setPersonalMode(m.id)}
                className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  active ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-900"
                }`}>
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold flex items-center gap-2 ${active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200"}`}>
                    {m.label} {active && <CheckCircle2 size={14} className="text-indigo-500" />}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Active Global Theme (read-only) ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <Palette size={16} className="text-indigo-400" /> Store Theme
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Set by the store admin — applies to all users.</p>
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

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-4">
        Display mode is saved on this device only.
      </p>

      {/* ── Floating Calculator ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <Calculator size={16} className="text-emerald-500" /> Floating Calculator
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Shows a calculator button (bottom-left) on every page — useful for quick price and quantity calculations.
        </p>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Show calculator button</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Tap the green 🧮 button at the bottom-left of any page to open it.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-semibold ${calcEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
              {calcEnabled ? "ON" : "OFF"}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !calcEnabled;
                setCalcEnabled(next);
                setCalculatorEnabled(next);
              }}
              className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none
                ${calcEnabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform
                ${calcEnabled ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserSettingsPage;
