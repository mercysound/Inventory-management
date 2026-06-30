import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import {
  Clock, Mail, RefreshCw, Save, AlertTriangle, CheckCircle2,
  Users, ShieldCheck, X, UserCheck, Loader2, Palette, Moon, Sun,
  Store, Package, Settings2, User, Phone, MapPin, Lock, Eye, EyeOff,
  Pencil, MessageCircle, CreditCard,
} from "lucide-react";
import { useTheme, GLOBAL_THEMES, PERSONAL_MODES } from "../../../context/ThemeContext";

const SettingsPage = () => {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const { globalTheme, setGlobalTheme, personalMode, setPersonalMode } = useTheme();

  const [settings, setSettings] = useState({
    orderExpiryHours:          48,
    reminderMode:              "repeat",
    reminderIntervalHours:     6,
    storeName:                 "Melech Store",
    adminNotificationEmail:    "",
    lowStockThreshold:         10,
    productExpiryWarningWeeks: 3,
    expiryReminderEnabled:     true,
    productExpiryEmailEnabled: true,
    bankName:       "",
    accountName:    "",
    accountNumber:  "",
    bankName2:      "",
    accountName2:   "",
    accountNumber2: "",
    contactEmail:              "",
    contactPhone:              "",
    contactWhatsapp:           "",
    contactAddress:            "",
  });

  const [delegation,        setDelegation]        = useState({ delegateToAllStaff: false, delegatedStaffIds: [] });
  const [delegationLoading, setDelegationLoading] = useState(true);
  const [delegationSaving,  setDelegationSaving]  = useState(false);
  const [allStaff,          setAllStaff]          = useState([]);
  const [staffLoading,      setStaffLoading]      = useState(false);
  const [showPicker,        setShowPicker]        = useState(false);
  const [pickerSearch,      setPickerSearch]      = useState("");

  // ── Wholesale access state ────────────────────────────────────────────────
  const [wholesale,        setWholesale]        = useState({ wholesaleAllStaff: false, wholesaleStaffIds: [] });
  const [wholesaleLoading, setWholesaleLoading] = useState(true);
  const [wholesaleSaving,  setWholesaleSaving]  = useState(false);
  const [showWsPicker,     setShowWsPicker]     = useState(false);
  const [wsPickerSearch,   setWsPickerSearch]   = useState("");

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profile,        setProfile]        = useState({ name: "", email: "", phone: "", address: "" });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editProfile,    setEditProfile]    = useState(false);
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [changePwd,      setChangePwd]      = useState(false);
  const [pwdData,        setPwdData]        = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOld,        setShowOld]        = useState(false);
  const [showNew,        setShowNew]        = useState(false);
  const [showConf,       setShowConf]       = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/settings");
      if (res.data.success) {
        const s = res.data.settings;
        setSettings({
          orderExpiryHours:          s.orderExpiryHours          ?? 48,
          reminderMode:              s.reminderMode              ?? "repeat",
          reminderIntervalHours:     s.reminderIntervalHours     ?? 6,
          storeName:                 s.storeName                 ?? "Melech Store",
          adminNotificationEmail:    s.adminNotificationEmail    ?? "",
          lowStockThreshold:         s.lowStockThreshold         ?? 10,
          productExpiryWarningWeeks: s.productExpiryWarningWeeks ?? 3,
          expiryReminderEnabled:     s.expiryReminderEnabled     ?? true,
          productExpiryEmailEnabled: s.productExpiryEmailEnabled ?? true,
          bankName:       s.bankName       ?? "",
          accountName:    s.accountName    ?? "",
          accountNumber:  s.accountNumber  ?? "",
          bankName2:      s.bankName2      ?? "",
          accountName2:   s.accountName2   ?? "",
          accountNumber2: s.accountNumber2 ?? "",
          contactEmail:              s.contactEmail              ?? "",
          contactPhone:              s.contactPhone              ?? "",
          contactWhatsapp:           s.contactWhatsapp           ?? "",
          contactAddress:            s.contactAddress            ?? "",
        });
      }
    } catch { toast.error("Failed to load settings"); }
    finally { setLoading(false); }
  };

  const fetchDelegation = useCallback(async () => {
    try {
      setDelegationLoading(true);
      const res = await axiosInstance.get("/settings/delegation");
      if (res.data.success) {
        setDelegation({
          delegateToAllStaff: res.data.delegateToAllStaff ?? false,
          delegatedStaffIds:  res.data.delegatedStaffIds  ?? [],
        });
      }
    } catch {} finally { setDelegationLoading(false); }
  }, []);

  const fetchAllStaff = useCallback(async () => {
    if (allStaff.length > 0) return;
    try {
      setStaffLoading(true);
      const res = await axiosInstance.get("/users");
      if (res.data.users) setAllStaff(res.data.users.filter((u) => u.role === "staff" && u.isActive !== false));
    } catch { toast.error("Failed to load staff list"); }
    finally { setStaffLoading(false); }
  }, [allStaff.length]);

  const fetchWholesaleAccess = useCallback(async () => {
    try {
      setWholesaleLoading(true);
      const res = await axiosInstance.get("/settings/wholesale-access");
      if (res.data.success) {
        setWholesale({
          wholesaleAllStaff: res.data.wholesaleAllStaff ?? false,
          wholesaleStaffIds: res.data.wholesaleStaffIds ?? [],
        });
      }
    } catch {} finally { setWholesaleLoading(false); }
  }, []);

  const saveWholesaleAccess = async (patch) => {
    setWholesaleSaving(true);
    try {
      const res = await axiosInstance.put("/settings/wholesale-access", patch);
      if (res.data.success) {
        setWholesale({ wholesaleAllStaff: res.data.wholesaleAllStaff, wholesaleStaffIds: res.data.wholesaleStaffIds ?? [] });
        try { window.dispatchEvent(new CustomEvent("wholesaleAccessChanged")); } catch {}
        toast.success("Wholesale access updated");
      }
    } catch { toast.error("Failed to update wholesale access"); }
    finally { setWholesaleSaving(false); }
  };

  const toggleWholesaleAll = () => saveWholesaleAccess({ wholesaleAllStaff: !wholesale.wholesaleAllStaff });

  const addWsDelegate = (staffId) => {
    const current = wholesale.wholesaleStaffIds.map((s) => s._id || String(s));
    if (!current.includes(staffId)) saveWholesaleAccess({ wholesaleAllStaff: false, wholesaleStaffIds: [...current, staffId] });
    setShowWsPicker(false);
  };

  const removeWsDelegate = (staffId) => {
    const updated = wholesale.wholesaleStaffIds
      .filter((s) => (s._id || String(s)) !== staffId)
      .map((s) => s._id || String(s));
    saveWholesaleAccess({ wholesaleAllStaff: false, wholesaleStaffIds: updated });
  };

  useEffect(() => { fetchSettings(); fetchDelegation(); fetchWholesaleAccess(); }, []);

  // ── Profile fetch + save ──────────────────────────────────────────────────
  useEffect(() => {
    axiosInstance.get("/users/profile")
      .then((res) => {
        if (res.data.success) {
          const d = res.data._doc;
          setProfile({ name: d?.name || "", email: d?.email || "", phone: d?.phone || "", address: d?.address || "" });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (changePwd) {
      if (!pwdData.oldPassword) { toast.error("Enter your current password"); return; }
      if (!pwdData.newPassword)  { toast.error("Enter a new password"); return; }
      if (pwdData.newPassword.length < 6) { toast.error("Min 6 characters for new password"); return; }
      if (pwdData.newPassword !== pwdData.confirmPassword) { toast.error("Passwords do not match"); return; }
    }
    setSavingProfile(true);
    try {
      const payload = { ...profile };
      if (changePwd) { payload.oldPassword = pwdData.oldPassword; payload.password = pwdData.newPassword; }
      const res = await axiosInstance.put("/users/profile", payload);
      if (res.data.success) {
        toast.success("Profile updated");
        setEditProfile(false); setChangePwd(false);
        setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else { toast.error("Failed to update profile"); }
    } catch (err) { toast.error(err?.response?.data?.message || "Error updating profile"); }
    finally { setSavingProfile(false); }
  };

  const handleChange = (field, value) => { setSettings((p) => ({ ...p, [field]: value })); setSaved(false); };

  const handleDelegationSave = async (patch) => {
    setDelegationSaving(true);
    try {
      const res = await axiosInstance.put("/settings/delegation", patch);
      if (res.data.success) {
        setDelegation({ delegateToAllStaff: res.data.delegateToAllStaff ?? false, delegatedStaffIds: res.data.delegatedStaffIds ?? [] });
        toast.success("Delegation settings saved.");
        window.dispatchEvent(new CustomEvent("delegationChanged"));
      }
    } catch { toast.error("Failed to save delegation settings"); }
    finally { setDelegationSaving(false); }
  };

  const toggleDelegateAll = () => {
    const next = !delegation.delegateToAllStaff;
    handleDelegationSave({ delegateToAllStaff: next, delegatedStaffIds: next ? [] : delegation.delegatedStaffIds.map((u) => u._id || u) });
  };
  const addStaffDelegate = (staffId) => {
    const current = delegation.delegatedStaffIds.map((u) => u._id || String(u));
    if (current.includes(staffId)) return;
    handleDelegationSave({ delegateToAllStaff: false, delegatedStaffIds: [...current, staffId] });
    setShowPicker(false); setPickerSearch("");
  };
  const removeStaffDelegate = (staffId) => {
    const newIds = delegation.delegatedStaffIds.map((u) => u._id || String(u)).filter((id) => id !== staffId);
    handleDelegationSave({ delegateToAllStaff: false, delegatedStaffIds: newIds });
  };

  const handleSave = async () => {
    if (!settings.orderExpiryHours || settings.orderExpiryHours < 1) { toast.error("Expiry hours must be at least 1"); return; }
    if (settings.reminderMode === "repeat" && settings.reminderIntervalHours < 1) { toast.error("Reminder interval must be at least 1 hour"); return; }
    if (!settings.lowStockThreshold || settings.lowStockThreshold < 1) { toast.error("Low stock threshold must be at least 1"); return; }
    if (!settings.productExpiryWarningWeeks || settings.productExpiryWarningWeeks < 1) { toast.error("Expiry warning must be at least 1 week"); return; }
    setSaving(true);
    try {
      const res = await axiosInstance.put("/settings", settings);
      if (res.data.success) { toast.success("Settings saved!"); setSaved(true); }
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  const numInput = (field, min, max, ringColor = "focus:ring-indigo-300") => ({
    type: "number", min, max,
    value: settings[field],
    onWheel: (e) => e.currentTarget.blur(),
    onChange: (e) => {
      const raw = e.target.value;
      if (raw === "") { handleChange(field, ""); return; }
      const n = parseInt(raw, 10);
      if (isNaN(n) || n < 0) return;
      handleChange(field, n);
    },
    onBlur: (e) => {
      const n = parseInt(e.target.value, 10);
      if (isNaN(n) || n < min) handleChange(field, min);
    },
    className: `w-32 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
      focus:outline-none focus:ring-2 ${ringColor} bg-gray-50 dark:bg-gray-800
      dark:text-gray-100 text-center font-semibold`,
  });

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings2 size={22} className="text-indigo-500" /> App Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure global preferences. Settings are saved per admin account and persist across all devices.
        </p>
      </div>

      {/* ── Account / Profile ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <User size={16} className="text-indigo-500" /> My Account
          </h2>
          {!editProfile && !loadingProfile && (
            <button onClick={() => setEditProfile(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400
                hover:text-indigo-800 border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 rounded-lg transition">
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>
        <div className="px-6 py-5">
          {loadingProfile ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={15} className="animate-spin" /> Loading...
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Full Name",   icon: User,   field: "name",    type: "text",  placeholder: "Admin name" },
                  { label: "Phone",       icon: Phone,  field: "phone",   type: "tel",   placeholder: "Phone number" },
                  { label: "Address",     icon: MapPin, field: "address", type: "text",  placeholder: "Address" },
                ].map(({ label, icon: Icon, field, type, placeholder }) => (
                  <div key={field} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Icon size={11} className="text-gray-400" /> {label}
                    </label>
                    <input type={type} value={profile[field]}
                      onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                      disabled={!editProfile} placeholder={placeholder}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all ${
                        !editProfile
                          ? "bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                      }`} />
                  </div>
                ))}
                {/* Email always disabled */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Mail size={11} className="text-gray-400" /> Email
                  </label>
                  <input type="email" value={profile.email} disabled
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed" />
                  <p className="text-[10px] text-gray-400">Email cannot be changed</p>
                </div>
              </div>

              {/* Password change */}
              {editProfile && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button type="button" onClick={() => setChangePwd((p) => !p)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5">
                    <Lock size={13} /> {changePwd ? "Cancel password change" : "Change password"}
                  </button>
                  {changePwd && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Current Password", field: "oldPassword", show: showOld, setShow: setShowOld },
                        { label: "New Password",      field: "newPassword", show: showNew, setShow: setShowNew },
                        { label: "Confirm Password",  field: "confirmPassword", show: showConf, setShow: setShowConf },
                      ].map(({ label, field, show, setShow }) => (
                        <div key={field} className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
                          <div className="relative">
                            <input type={show ? "text" : "password"} placeholder={label}
                              value={pwdData[field]}
                              onChange={(e) => setPwdData((p) => ({ ...p, [field]: e.target.value }))}
                              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm pr-10
                                focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-900 dark:text-gray-200" />
                            <button type="button" onClick={() => setShow((s) => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                              {show ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editProfile && (
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={savingProfile}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700
                      disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm">
                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                  <button type="button" disabled={savingProfile}
                    onClick={() => { setEditProfile(false); setChangePwd(false); setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" }); }}
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

      {/* Store Information */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Store size={16} className="text-indigo-500" /> Store Information
        </h2>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Store Name</label>
          <input type="text" value={settings.storeName} onChange={(e) => handleChange("storeName", e.target.value)}
            placeholder="e.g. Melech Store"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900
              dark:text-gray-100 dark:placeholder-gray-500" />
          <p className="text-xs text-gray-400 mt-1">Used in email notifications and receipts.</p>
        </div>
      </motion.div>

      {/* Order Pickup Expiry */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">

        {/* Card header — title + ON/OFF email reminder toggle */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" /> Order Pickup Expiry
          </h2>

          {/* Email reminder master switch */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className={`text-xs font-semibold ${settings.expiryReminderEnabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
              {settings.expiryReminderEnabled ? "Emails ON" : "Emails OFF"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.expiryReminderEnabled}
              title={settings.expiryReminderEnabled ? "Click to stop sending expiry reminder emails" : "Click to enable expiry reminder emails"}
              onClick={() => handleChange("expiryReminderEnabled", !settings.expiryReminderEnabled)}
              className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
                ${settings.expiryReminderEnabled
                  ? "bg-green-500 focus:ring-green-400"
                  : "bg-gray-300 dark:bg-gray-600 focus:ring-gray-400"}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform
                ${settings.expiryReminderEnabled ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          When a paid order exceeds this time limit without being picked up, you are notified by email.
        </p>

        {/* Subtle OFF banner — explains what's paused */}
        {!settings.expiryReminderEnabled && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-4 mt-2">
            <span className="text-amber-500 text-base">🔕</span>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Expiry reminder emails are paused. Orders will still appear on the Expiring Orders page — only the email notifications are silenced.
            </p>
          </div>
        )}

        {/* Controls — dimmed when reminders are OFF */}
        <div className={`space-y-5 mt-4 transition-opacity duration-200 ${settings.expiryReminderEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Expiry Threshold (hours)</label>
            <div className="flex items-center gap-3">
              <input {...numInput("orderExpiryHours", 1, 720, "focus:ring-amber-300")} />
              <span className="text-sm text-gray-500 dark:text-gray-400">hours after order placement</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Email Reminder Mode</label>
            <div className="flex flex-col sm:flex-row gap-3">
              {[{ value: "once", label: "One-time only", desc: "Send a single email when the order first expires.", icon: "1x" },
                { value: "repeat", label: "Repeat reminders", desc: "Keep sending reminders every X hours.", icon: "loop" }]
                .map((opt) => (
                  <button key={opt.value} type="button" onClick={() => handleChange("reminderMode", opt.value)}
                    className={`flex-1 text-left p-4 rounded-xl border-2 transition-all ${
                      settings.reminderMode === opt.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-900"
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${settings.reminderMode === opt.value ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</span>
                      {settings.reminderMode === opt.value && <CheckCircle2 size={14} className="text-indigo-500 ml-auto" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                  </button>
                ))}
            </div>
          </div>
          {settings.reminderMode === "repeat" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Reminder Interval (hours)</label>
              <div className="flex items-center gap-3">
                <input {...numInput("reminderIntervalHours", 1, 168, "focus:ring-amber-300")} />
                <span className="text-sm text-gray-500 dark:text-gray-400">hours between each reminder</span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Notification Email */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <Mail size={16} className="text-blue-500" /> Admin Notification Email
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          All admin notifications go here — new orders, expiry alerts, reminders. Leave blank to use your account email.
        </p>
        <input type="email" value={settings.adminNotificationEmail}
          onChange={(e) => handleChange("adminNotificationEmail", e.target.value)}
          placeholder="admin@yourdomain.com"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 dark:bg-gray-900
            dark:text-gray-100 dark:placeholder-gray-500" />
        <p className="text-xs text-gray-400 mt-1.5">Covers: new order alerts, expiry alerts, and repeat reminders.</p>
      </motion.div>

      {/* Store Contact Info */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <MapPin size={16} className="text-green-500" /> Store Contact Info
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          These details appear publicly on the landing page so customers know how to reach you.
        </p>
        <div className="space-y-4">
          {/* Contact email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Mail size={11} /> Contact Email
            </label>
            <input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
              placeholder="store@yourdomain.com"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 dark:bg-gray-900
                dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* Contact phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Phone size={11} /> Contact Phone
            </label>
            <input
              type="tel"
              value={settings.contactPhone}
              onChange={(e) => handleChange("contactPhone", e.target.value)}
              placeholder="e.g. 08012345678"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 dark:bg-gray-900
                dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <MessageCircle size={11} /> WhatsApp Number
              <span className="normal-case font-normal text-gray-400 text-[10px] ml-1">optional</span>
            </label>
            <input
              type="tel"
              value={settings.contactWhatsapp}
              onChange={(e) => handleChange("contactWhatsapp", e.target.value)}
              placeholder="e.g. 2348012345678 (with country code)"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 dark:bg-gray-900
                dark:text-gray-100 dark:placeholder-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">Enter with country code for the WhatsApp link to work (e.g. 234 for Nigeria).</p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <MapPin size={11} /> Physical Address
            </label>
            <textarea
              rows={3}
              value={settings.contactAddress}
              onChange={(e) => handleChange("contactAddress", e.target.value)}
              placeholder="e.g. 12 Market Street, Lagos, Nigeria"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 dark:bg-gray-900
                dark:text-gray-100 dark:placeholder-gray-500 resize-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Payment / Bank Account Details */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <CreditCard size={16} className="text-indigo-500" /> Payment / Bank Account Details
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          These details appear on staff preview invoices so customers know where to send payment. Leave blank to hide.
        </p>

        {/* Account 1 */}
        <div className="space-y-3 mb-5">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Account 1</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Bank Name</label>
              <input type="text" value={settings.bankName}
                onChange={(e) => handleChange("bankName", e.target.value)}
                placeholder="e.g. GTBank"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900
                  dark:text-gray-100 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Account Name</label>
              <input type="text" value={settings.accountName}
                onChange={(e) => handleChange("accountName", e.target.value)}
                placeholder="e.g. Melech Stores Ltd"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900
                  dark:text-gray-100 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Account Number</label>
              <input type="text" value={settings.accountNumber}
                onChange={(e) => handleChange("accountNumber", e.target.value)}
                placeholder="e.g. 0123456789"
                maxLength={20}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900
                  dark:text-gray-100 dark:placeholder-gray-500 font-mono tracking-wider" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-4" />

        {/* Account 2 */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
            Account 2
            <span className="ml-2 normal-case font-normal text-gray-400 text-[10px]">optional — for a second bank</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Bank Name</label>
              <input type="text" value={settings.bankName2}
                onChange={(e) => handleChange("bankName2", e.target.value)}
                placeholder="e.g. Opay"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900
                  dark:text-gray-100 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Account Name</label>
              <input type="text" value={settings.accountName2}
                onChange={(e) => handleChange("accountName2", e.target.value)}
                placeholder="e.g. Melech Stores Ltd"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900
                  dark:text-gray-100 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Account Number</label>
              <input type="text" value={settings.accountNumber2}
                onChange={(e) => handleChange("accountNumber2", e.target.value)}
                placeholder="e.g. 0987654321"
                maxLength={20}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900
                  dark:text-gray-100 dark:placeholder-gray-500 font-mono tracking-wider" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Inventory Alerts */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">

        {/* Card header with product expiry email toggle */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Inventory Alerts
          </h2>
          {/* Product expiry email master switch */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className={`text-xs font-semibold ${settings.productExpiryEmailEnabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
              {settings.productExpiryEmailEnabled ? "Emails ON" : "Emails OFF"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.productExpiryEmailEnabled}
              title={settings.productExpiryEmailEnabled ? "Click to stop sending product expiry emails" : "Click to enable product expiry emails"}
              onClick={() => handleChange("productExpiryEmailEnabled", !settings.productExpiryEmailEnabled)}
              className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
                ${settings.productExpiryEmailEnabled
                  ? "bg-green-500 focus:ring-green-400"
                  : "bg-gray-300 dark:bg-gray-600 focus:ring-gray-400"}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform
                ${settings.productExpiryEmailEnabled ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Configure thresholds that trigger notifications.</p>

        {/* OFF banner */}
        {!settings.productExpiryEmailEnabled && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-4 mt-2">
            <span className="text-amber-500 text-base">🔕</span>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Product expiry emails are paused. Products will still appear on the Products page with expiry badges — only the daily digest email is silenced.
            </p>
          </div>
        )}

        {/* Controls — dimmed when OFF */}
        <div className={`space-y-5 mt-4 transition-opacity duration-200 ${settings.productExpiryEmailEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Low Stock Alert Threshold (units)</label>
            <div className="flex items-center gap-3">
              <input {...numInput("lowStockThreshold", 1, 10000, "focus:ring-red-300")} />
              <span className="text-sm text-gray-500 dark:text-gray-400">units remaining</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Products at or below this count are highlighted as low stock.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Product Expiry Warning (weeks before)</label>
            <div className="flex items-center gap-3">
              <input {...numInput("productExpiryWarningWeeks", 1, 52, "focus:ring-red-300")} />
              <span className="text-sm text-gray-500 dark:text-gray-400">weeks before expiry date</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">You receive a daily digest email for products expiring within this window.</p>
          </div>
        </div>
      </motion.div>

      {/* Global App Theme */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <Palette size={16} className="text-indigo-500" /> Global App Theme
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Choose a colour palette that applies to every user in the store. Changes take effect immediately.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GLOBAL_THEMES.map((t) => {
            const active = globalTheme === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setGlobalTheme(t.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  active ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-900"
                }`}>
                <span className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-sm" style={{ background: t.color }}>
                  {active && <CheckCircle2 size={16} className="text-white" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200"}`}>{t.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-2.5 text-xs text-indigo-700 dark:text-indigo-300">
          <Palette size={13} />
          Active: <strong className="ml-1">{GLOBAL_THEMES.find((t) => t.id === globalTheme)?.label}</strong>
          <span className="ml-1 text-indigo-400"> — saves automatically on click</span>
        </div>
      </motion.div>

      {/* Personal Display Mode */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.145 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          {personalMode === "dark" ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-400" />}
          My Display Mode
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Your personal light or dark preference. Only affects your view — does not change what other users see.
        </p>
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

      {/* Staff Order Delegation */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-500" /> Staff Order Management Delegation
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Grant staff the ability to search, view, and update placed order statuses. Delegated staff receive an email notification when access changes.
        </p>
        {delegationLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <Loader2 size={15} className="animate-spin" /> Loading delegation settings...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              {[{ value: true, label: "All Staff", desc: "Every active staff member can manage placed orders.", icon: "all" },
                { value: false, label: "Specific Staff Only", desc: "You choose which staff members have access.", icon: "pick" }]
                .map((opt) => (
                  <button key={String(opt.value)} type="button" disabled={delegationSaving}
                    onClick={() => { if (opt.value !== delegation.delegateToAllStaff) toggleDelegateAll(); }}
                    className={`flex-1 text-left p-4 rounded-xl border-2 transition-all disabled:opacity-60 ${
                      delegation.delegateToAllStaff === opt.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-900"
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${delegation.delegateToAllStaff === opt.value ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</span>
                      {delegation.delegateToAllStaff === opt.value && <CheckCircle2 size={14} className="text-indigo-500 ml-auto" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
            </div>

            {!delegation.delegateToAllStaff && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Delegated Staff ({delegation.delegatedStaffIds.length})
                  </p>
                  <button onClick={() => { setShowPicker((p) => !p); fetchAllStaff(); }} disabled={delegationSaving}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold disabled:opacity-50 transition">
                    <UserCheck size={13} /> Add Staff
                  </button>
                </div>
                {delegation.delegatedStaffIds.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No staff delegated yet. Click "Add Staff" to grant access.</p>
                ) : (
                  <ul className="space-y-2">
                    {delegation.delegatedStaffIds.map((s) => {
                      const id = s._id || String(s); const name = s.name || "Staff Member"; const email = s.email || "";
                      return (
                        <li key={id} className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-indigo-500" />
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{name}</p>
                              {email && <p className="text-xs text-gray-400">{email}</p>}
                            </div>
                          </div>
                          <button onClick={() => removeStaffDelegate(id)} disabled={delegationSaving}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50">
                            <X size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <AnimatePresence>
                  {showPicker && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="border border-gray-200 dark:border-gray-600 rounded-xl shadow-md bg-white dark:bg-gray-900 overflow-hidden">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <input autoFocus type="text" placeholder="Search staff by name or email..."
                          value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-800 dark:text-gray-100" />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {staffLoading ? (
                          <div className="flex items-center gap-2 p-3 text-gray-400 text-xs"><Loader2 size={13} className="animate-spin" /> Loading staff...</div>
                        ) : (() => {
                          const delegatedIds = delegation.delegatedStaffIds.map((u) => u._id || String(u));
                          const filtered = allStaff.filter((s) =>
                            !delegatedIds.includes(String(s._id)) &&
                            (!pickerSearch || s.name?.toLowerCase().includes(pickerSearch.toLowerCase()) || s.email?.toLowerCase().includes(pickerSearch.toLowerCase()))
                          );
                          if (!filtered.length) return <p className="text-xs text-gray-400 p-3 text-center">No staff available.</p>;
                          return filtered.map((s) => (
                            <button key={s._id} type="button" onClick={() => addStaffDelegate(String(s._id))}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                              <Users size={14} className="text-gray-400 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.email}</p>
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {delegation.delegateToAllStaff && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-300">All active staff can currently manage placed orders.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Staff Wholesale Pricing Access */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.125 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <Store size={16} className="text-amber-500" /> Staff Wholesale Pricing Access
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Control which staff members can switch to wholesale pricing on walk-in sales. Staff without access will not see the wholesale toggle on their cart page.
        </p>

        {wholesaleLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <Loader2 size={15} className="animate-spin" /> Loading...
          </div>
        ) : (
          <div className="space-y-5">
            {/* All / Specific toggle */}
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { value: true,  label: "All Staff",          desc: "Every active staff member can use wholesale pricing." },
                { value: false, label: "Specific Staff Only", desc: "You choose which staff members can use wholesale pricing." },
              ].map((opt) => (
                <button key={String(opt.value)} type="button" disabled={wholesaleSaving}
                  onClick={() => { if (opt.value !== wholesale.wholesaleAllStaff) toggleWholesaleAll(); }}
                  className={`flex-1 text-left p-4 rounded-xl border-2 transition-all disabled:opacity-60 ${
                    wholesale.wholesaleAllStaff === opt.value
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-900"
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${wholesale.wholesaleAllStaff === opt.value ? "text-amber-700 dark:text-amber-300" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</span>
                    {wholesale.wholesaleAllStaff === opt.value && <CheckCircle2 size={14} className="text-amber-500 ml-auto" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Specific staff list */}
            {!wholesale.wholesaleAllStaff && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Allowed Staff ({wholesale.wholesaleStaffIds.length})
                  </p>
                  <button onClick={() => { setShowWsPicker((p) => !p); fetchAllStaff(); }} disabled={wholesaleSaving}
                    className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 font-semibold disabled:opacity-50 transition">
                    <UserCheck size={13} /> Add Staff
                  </button>
                </div>

                {wholesale.wholesaleStaffIds.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No staff allowed yet. Click "Add Staff" to grant wholesale access.</p>
                ) : (
                  <ul className="space-y-2">
                    {wholesale.wholesaleStaffIds.map((s) => {
                      const id = s._id || String(s); const name = s.name || "Staff Member"; const email = s.email || "";
                      return (
                        <li key={id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-amber-500" />
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{name}</p>
                              {email && <p className="text-xs text-gray-400">{email}</p>}
                            </div>
                          </div>
                          <button onClick={() => removeWsDelegate(id)} disabled={wholesaleSaving}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50">
                            <X size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <AnimatePresence>
                  {showWsPicker && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="border border-gray-200 dark:border-gray-600 rounded-xl shadow-md bg-white dark:bg-gray-900 overflow-hidden">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <input autoFocus type="text" placeholder="Search staff..."
                          value={wsPickerSearch} onChange={(e) => setWsPickerSearch(e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                            focus:outline-none focus:ring-2 focus:ring-amber-300 dark:bg-gray-800 dark:text-gray-100" />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {staffLoading ? (
                          <div className="flex items-center gap-2 p-3 text-gray-400 text-xs"><Loader2 size={13} className="animate-spin" /> Loading staff...</div>
                        ) : (() => {
                          const allowedIds = wholesale.wholesaleStaffIds.map((u) => u._id || String(u));
                          const filtered = allStaff.filter((s) =>
                            !allowedIds.includes(String(s._id)) &&
                            (!wsPickerSearch || s.name?.toLowerCase().includes(wsPickerSearch.toLowerCase()) || s.email?.toLowerCase().includes(wsPickerSearch.toLowerCase()))
                          );
                          if (!filtered.length) return <p className="text-xs text-gray-400 p-3 text-center">No staff available.</p>;
                          return filtered.map((s) => (
                            <button key={s._id} type="button" onClick={() => addWsDelegate(String(s._id))}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition">
                              <Users size={14} className="text-gray-400 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.email}</p>
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {wholesale.wholesaleAllStaff && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <CheckCircle2 size={15} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">All active staff can currently use wholesale pricing.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Product Draft Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex gap-3">
        <Package size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <p className="font-semibold mb-0.5">Product form draft</p>
          <p>
            When you start filling the Add Product form and close it without saving,
            your progress is automatically saved to your account — not just this device.
            The draft is cleared automatically when you successfully add the product.
          </p>
        </div>
      </div>

      {/* How expiry notifications work */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex gap-3">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <p className="font-semibold mb-0.5">How expiry notifications work</p>
          <p>
            The system checks all active placed orders every <strong>15 minutes</strong> in the background.
            When an order exceeds your configured expiry time, you receive an email notification.
            Cancelled and delivered orders are excluded from future notifications automatically.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pb-6">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700
            disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition shadow-sm">
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
            <CheckCircle2 size={14} /> Saved
          </motion.span>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
