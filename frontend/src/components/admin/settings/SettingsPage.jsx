import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import {
  Clock, Mail, RefreshCw, Save, AlertTriangle, CheckCircle2,
  Users, ShieldCheck, X, UserCheck, Loader2, Palette, Moon, Sun,
  Store, Package, Settings2, User, Phone, MapPin, Lock, Eye, EyeOff,
  Pencil, MessageCircle, CreditCard, Bell, ChevronDown, Wrench, Calculator,
} from "lucide-react";
import { useTheme, GLOBAL_THEMES, PERSONAL_MODES } from "../../../context/ThemeContext";
import { isCalculatorEnabled, setCalculatorEnabled } from "../../share-component/calculator/FloatingCalculator";

// -- SettingSection � collapsible accordion card ------------------------------
// Defined OUTSIDE SettingsPage so it is never re-created on parent renders.
const SettingSection = ({ id, icon: Icon, iconColor = "text-indigo-500", title, subtitle, children, badge, openSection, onToggle }) => {
  const isOpen = openSection === id;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button type="button"
        onClick={() => {
          // Preserve scroll position � read before state update, restore after paint
          const scroller = document.getElementById("main-scroll");
          const savedScrollTop = scroller ? scroller.scrollTop : window.scrollY;
          onToggle(id);
          // After React re-renders, restore scroll so page doesn't jump
          requestAnimationFrame(() => {
            if (scroller) scroller.scrollTop = savedScrollTop;
            else window.scrollTo(0, savedScrollTop);
          });
        }}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isOpen ? "bg-indigo-600" : "bg-gray-100 dark:bg-gray-700"}`}>
            <Icon size={15} className={isOpen ? "text-white" : iconColor} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</span>
              {badge && <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">{badge}</span>}
            </div>
            {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-xs">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform shrink-0 ml-3 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-gray-700">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsPage = () => {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const { globalTheme, setGlobalTheme, personalMode, setPersonalMode } = useTheme();

  // -- Accordion state ------------------------------------------------------
  const [openSection, setOpenSection] = useState(null);
  const toggleSection = (id) => setOpenSection((prev) => prev === id ? null : id);

  // ── Calculator preference (per-device, localStorage) ─────────────────────
  const [calcEnabled, setCalcEnabled] = useState(isCalculatorEnabled);

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

  // -- Wholesale access state ------------------------------------------------
  const [wholesale,        setWholesale]        = useState({ wholesaleAllStaff: false, wholesaleStaffIds: [] });
  const [wholesaleLoading, setWholesaleLoading] = useState(true);
  const [wholesaleSaving,  setWholesaleSaving]  = useState(false);
  const [showWsPicker,     setShowWsPicker]     = useState(false);
  const [wsPickerSearch,   setWsPickerSearch]   = useState("");

  // -- Guest browsing + maintenance mode ------------------------------------
  const [guestBrowsing,   setGuestBrowsing]   = useState(true);
  const [guestSaving,     setGuestSaving]     = useState(false);
  const [maintenance,     setMaintenance]     = useState({ maintenanceMode: false, maintenanceModeMessage: "" });
  const [maintSaving,     setMaintSaving]     = useState(false);

  // -- Profile state ---------------------------------------------------------
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
          // Abandoned cart reminder
          abandonedCartReminderEnabled: s.abandonedCartReminderEnabled ?? false,
          abandonedCartReminderMinutes: s.abandonedCartReminderMinutes ?? 15,
          abandonedCartReminderRoles:   s.abandonedCartReminderRoles   ?? ["customer", "wholesale"],
        });
        // Guest browsing + maintenance
        setGuestBrowsing(s.guestBrowsingEnabled !== false);
        setMaintenance({
          maintenanceMode:        s.maintenanceMode        ?? false,
          maintenanceModeMessage: s.maintenanceModeMessage ?? "",
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

  // -- Profile fetch + save --------------------------------------------------
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

  // ── Guest browsing toggle ─────────────────────────────────────────────────
  const toggleGuestBrowsing = async () => {
    const next = !guestBrowsing;
    setGuestBrowsing(next);
    setGuestSaving(true);
    try {
      await axiosInstance.put("/settings/guest-browsing", { guestBrowsingEnabled: next });
      toast.success(next ? "Guest browsing enabled" : "Guest browsing disabled");
    } catch {
      setGuestBrowsing(!next); // rollback
      toast.error("Failed to update guest browsing setting");
    } finally { setGuestSaving(false); }
  };

  // ── Maintenance mode save ─────────────────────────────────────────────────
  const saveMaintenance = async (mode, msg) => {
    setMaintSaving(true);
    try {
      await axiosInstance.put("/settings/maintenance", {
        maintenanceMode:        mode,
        maintenanceModeMessage: msg,
      });
      setMaintenance({ maintenanceMode: mode, maintenanceModeMessage: msg });
      toast.success(mode ? "⚠️ Maintenance mode ON — users will be notified" : "Maintenance mode OFF");
    } catch { toast.error("Failed to update maintenance mode"); }
    finally { setMaintSaving(false); }
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

      {/* -- Account / Profile ----------------------------------------------- */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="account" icon={User} title="My Account" subtitle="Edit your name, phone, address and password">
        {loadingProfile ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
            <Loader2 size={15} className="animate-spin" /> Loading...
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4 mt-3">
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
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Mail size={11} className="text-gray-400" /> Email
                </label>
                <input type="email" value={profile.email} disabled
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed" />
                <p className="text-[10px] text-gray-400">Email cannot be changed</p>
              </div>
            </div>
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
            <div className="flex gap-2 pt-1">
              {!editProfile ? (
                <button type="button" onClick={() => setEditProfile(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 rounded-lg transition hover:bg-indigo-50">
                  <Pencil size={12} /> Edit Profile
                </button>
              ) : (
                <>
                  <button type="submit" disabled={savingProfile}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm">
                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                  <button type="button" disabled={savingProfile}
                    onClick={() => { setEditProfile(false); setChangePwd(false); setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" }); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <X size={14} /> Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </SettingSection>

      {/* Store Information */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="store-info" icon={Store} title="Store Information" subtitle={settings.storeName || "Store name, used in emails & receipts"}>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Store Name</label>
          <input type="text" value={settings.storeName} onChange={(e) => handleChange("storeName", e.target.value)}
            placeholder="e.g. Melech Store"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900
              dark:text-gray-100 dark:placeholder-gray-500" />
          <p className="text-xs text-gray-400 mt-1">Used in email notifications and receipts.</p>
        </div>
      </SettingSection>

      {/* Order Pickup Expiry */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="expiry" icon={Clock} iconColor="text-amber-500" title="Order Pickup Expiry" subtitle={`Threshold: ${settings.orderExpiryHours}h � ${settings.expiryReminderEnabled ? "Emails ON" : "Emails OFF"}`}>
        <div className="mt-3 space-y-5">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Expiry email reminders</p>
              <p className="text-xs text-gray-400 mt-0.5">When a paid order exceeds the limit without being picked up, you get notified.</p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className={`text-xs font-semibold ${settings.expiryReminderEnabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {settings.expiryReminderEnabled ? "ON" : "OFF"}
              </span>
              <button type="button" role="switch" aria-checked={settings.expiryReminderEnabled}
                onClick={() => handleChange("expiryReminderEnabled", !settings.expiryReminderEnabled)}
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none
                  ${settings.expiryReminderEnabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform
                  ${settings.expiryReminderEnabled ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          {!settings.expiryReminderEnabled && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              <span className="text-amber-500">??</span>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Emails paused � orders still appear on the Expiring Orders page.</p>
            </div>
          )}
          <div className={`space-y-5 transition-opacity ${settings.expiryReminderEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Expiry Threshold (hours)</label>
              <div className="flex items-center gap-3">
                <input {...numInput("orderExpiryHours", 1, 720, "focus:ring-amber-300")} />
                <span className="text-sm text-gray-500 dark:text-gray-400">hours after order placement</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Reminder Mode</label>
              <div className="flex flex-col sm:flex-row gap-3">
                {[{ value: "once", label: "One-time only", desc: "One email when order first expires." },
                  { value: "repeat", label: "Repeat reminders", desc: "Keep sending every X hours." }]
                  .map((opt) => (
                    <button key={opt.value} type="button" onClick={() => handleChange("reminderMode", opt.value)}
                      className={`flex-1 text-left p-3 rounded-xl border-2 transition-all ${
                        settings.reminderMode === opt.value
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                          : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900"}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-semibold ${settings.reminderMode === opt.value ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</span>
                        {settings.reminderMode === opt.value && <CheckCircle2 size={13} className="text-indigo-500 ml-auto" />}
                      </div>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </button>
                  ))}
              </div>
            </div>
            {settings.reminderMode === "repeat" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Interval (hours)</label>
                <div className="flex items-center gap-3">
                  <input {...numInput("reminderIntervalHours", 1, 168, "focus:ring-amber-300")} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">hours between each reminder</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </SettingSection>

      {/* Notification Email */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="notif-email" icon={Mail} iconColor="text-blue-500" title="Admin Notification Email" subtitle={settings.adminNotificationEmail || "Leave blank to use your account email"}>
        <div className="mt-3 space-y-3">
          <input type="email" value={settings.adminNotificationEmail}
            onChange={(e) => handleChange("adminNotificationEmail", e.target.value)}
            placeholder="admin@yourdomain.com"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 dark:bg-gray-900
              dark:text-gray-100 dark:placeholder-gray-500" />
          {/* What this email address receives */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">This email receives ALL admin notifications:</p>
            <ul className="space-y-1">
              {[
                "🛒 New customer/wholesale order placed",
                "⏰ Order pickup expiry alerts & repeat reminders",
                "🕐 Low-stock inventory alerts",
                "📦 Product expiry digest emails",
              ].map((line) => (
                <li key={line} className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-1.5">
                  <span className="shrink-0">{line.slice(0, 2)}</span>
                  <span>{line.slice(2)}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-blue-500 dark:text-blue-400 pt-1 border-t border-blue-200 dark:border-blue-700 mt-1">
              Leave blank to fall back to your account login email.
              Changing this takes effect immediately — all future notifications go to the new address.
            </p>
          </div>
        </div>
      </SettingSection>

      {/* Store Contact Info */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="contact" icon={MapPin} iconColor="text-green-500" title="Store Contact Info" subtitle="Shown publicly on the landing page">
        <div className="space-y-4 mt-3">
          {[
            { label: "Contact Email",    icon: Mail,           field: "contactEmail",    type: "email", placeholder: "store@yourdomain.com",   ring: "focus:ring-green-300" },
            { label: "Contact Phone",    icon: Phone,          field: "contactPhone",    type: "tel",   placeholder: "e.g. 08012345678",        ring: "focus:ring-green-300" },
            { label: "WhatsApp Number",  icon: MessageCircle,  field: "contactWhatsapp", type: "tel",   placeholder: "e.g. 2348012345678",      ring: "focus:ring-green-300" },
          ].map(({ label, icon: Icon, field, type, placeholder, ring }) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Icon size={11} /> {label}
              </label>
              <input type={type} value={settings[field]} placeholder={placeholder}
                onChange={(e) => handleChange(field, e.target.value)}
                className={`w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${ring} bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500`} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <MapPin size={11} /> Physical Address
            </label>
            <textarea rows={3} value={settings.contactAddress}
              onChange={(e) => handleChange("contactAddress", e.target.value)}
              placeholder="e.g. 12 Market Street, Lagos, Nigeria"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 resize-none" />
          </div>
        </div>
      </SettingSection>

      {/* Payment / Bank Account Details */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="bank" icon={CreditCard} title="Payment / Bank Account Details" subtitle="Shown on staff invoices for bank transfer payments">
        <div className="mt-3 space-y-5">
          {[["Account 1", "bankName", "accountName", "accountNumber", ""], ["Account 2", "bankName2", "accountName2", "accountNumber2", " (optional)"]].map(([label, fn, an, acc, note]) => (
            <div key={fn}>
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">{label}{note && <span className="normal-case font-normal text-gray-400 text-[10px] ml-1">{note}</span>}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[["Bank Name", fn, "text", "e.g. GTBank"], ["Account Name", an, "text", "e.g. Melech Stores Ltd"], ["Account Number", acc, "text", "e.g. 0123456789"]].map(([l, f, t, p]) => (
                  <div key={f}>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{l}</label>
                    <input type={t} value={settings[f]} placeholder={p} maxLength={f.includes("Number") ? 20 : undefined}
                      onChange={(e) => handleChange(f, e.target.value)}
                      className={`w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 ${f.includes("Number") ? "font-mono tracking-wider" : ""}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SettingSection>

      {/* Inventory Alerts */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="inventory" icon={AlertTriangle} iconColor="text-red-500" title="Inventory Alerts" subtitle={`Low stock = ${settings.lowStockThreshold} units � Expiry = ${settings.productExpiryWarningWeeks}wk � Emails ${settings.productExpiryEmailEnabled ? "ON" : "OFF"}`}>
        <div className="mt-3 space-y-5">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Product expiry emails</p>
              <p className="text-xs text-gray-400 mt-0.5">Daily digest of products expiring within the warning window.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-semibold ${settings.productExpiryEmailEnabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {settings.productExpiryEmailEnabled ? "ON" : "OFF"}
              </span>
              <button type="button" onClick={() => handleChange("productExpiryEmailEnabled", !settings.productExpiryEmailEnabled)}
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${settings.productExpiryEmailEnabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${settings.productExpiryEmailEnabled ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Low Stock Alert Threshold (units)</label>
            <div className="flex items-center gap-3">
              <input {...numInput("lowStockThreshold", 1, 10000, "focus:ring-red-300")} />
              <span className="text-sm text-gray-500 dark:text-gray-400">units remaining</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Product Expiry Warning (weeks before)</label>
            <div className="flex items-center gap-3">
              <input {...numInput("productExpiryWarningWeeks", 1, 52, "focus:ring-red-300")} />
              <span className="text-sm text-gray-500 dark:text-gray-400">weeks before expiry date</span>
            </div>
          </div>
        </div>
      </SettingSection>

      {/* Global App Theme */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="theme" icon={Palette} title="Global App Theme" subtitle={`Active: ${GLOBAL_THEMES.find(t => t.id === globalTheme)?.label || globalTheme}`}>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GLOBAL_THEMES.map((t) => {
            const active = globalTheme === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setGlobalTheme(t.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${active ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-900"}`}>
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
      </SettingSection>

      {/* Personal Display Mode */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="display-mode" icon={personalMode === "dark" ? Moon : Sun} iconColor={personalMode === "dark" ? "text-indigo-400" : "text-amber-400"} title="My Display Mode" subtitle={`Current: ${PERSONAL_MODES.find(m => m.id === personalMode)?.label || personalMode} � only affects your view`}>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          {PERSONAL_MODES.map((m) => {
            const active = personalMode === m.id;
            return (
              <button key={m.id} type="button" onClick={() => setPersonalMode(m.id)}
                className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${active ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900"}`}>
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
      </SettingSection>

      {/* Staff Order Delegation */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="delegation" icon={ShieldCheck} title="Staff Order Delegation" subtitle={delegation.delegateToAllStaff ? "All staff can manage placed orders" : delegation.delegatedStaffIds.length > 0 ? `${delegation.delegatedStaffIds.length} staff can manage placed orders` : "No staff delegated yet"}>
        <div className="mt-3 space-y-4">
          {/* What this feature does */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">What delegated staff can do:</p>
            <ul className="space-y-1">
              {[
                "📦 See a new \"Placed Orders\" item in their sidebar",
                "🔍 Search any customer order by Order ID",
                "🔄 Change order status (pending → processing → delivered / cancel)",
                "💳 Mark refunds for orders they cancelled",
              ].map((line) => (
                <li key={line} className="text-xs text-indigo-800 dark:text-indigo-200 flex items-start gap-1.5">
                  <span className="shrink-0">{line.slice(0, 2)}</span>
                  <span>{line.slice(2)}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-indigo-500 dark:text-indigo-400 pt-1 border-t border-indigo-200 dark:border-indigo-700 mt-1">
              Every status change by a delegated staff is recorded in <strong>their history</strong>,
              the <strong>customer's history</strong>, and <strong>your admin history</strong> — each marked
              with a 🛡️ Delegated badge. You can still manage orders yourself at any time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {[{ value: true, label: "All Staff", desc: "Every active staff member gets the Placed Orders access.", icon: "all" },
              { value: false, label: "Specific Staff Only", desc: "You choose exactly which staff members have access.", icon: "pick" }]
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
      </SettingSection>
      <SettingSection openSection={openSection} onToggle={toggleSection} id="wholesale" icon={Store} iconColor="text-amber-500" title="Staff Wholesale Pricing Access" subtitle={wholesale.wholesaleAllStaff ? "All staff have access" : `${wholesale.wholesaleStaffIds.length} staff allowed`}>
        <div className="mt-3">
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
      </SettingSection>

      {/* Abandoned Cart Reminder */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="abandoned-cart" icon={Bell} title="Abandoned Cart Reminder" subtitle={`${settings.abandonedCartReminderEnabled ? "ON" : "OFF"} � fires ${settings.abandonedCartReminderMinutes}min before cart expires`}>
        <div className="mt-3 space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Enable abandoned cart emails</p>
              <p className="text-xs text-gray-400 mt-0.5">Send reminder before cart items expire</p>
            </div>
            <button type="button"
              onClick={() => handleChange("abandonedCartReminderEnabled", !settings.abandonedCartReminderEnabled)}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${settings.abandonedCartReminderEnabled ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"}`}>
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${settings.abandonedCartReminderEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          {settings.abandonedCartReminderEnabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Minutes before cart expires</p>
                  <p className="text-xs text-gray-400 mt-0.5">Cart TTL = 60 min. Default 15 = email at ~45 min mark.</p>
                </div>
                <input {...numInput("abandonedCartReminderMinutes", 1, 55, "focus:ring-indigo-300")}
                  className="w-24 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 text-center font-semibold" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Send to which roles</p>
                <div className="flex gap-3 flex-wrap">
                  {["customer", "wholesale"].map((role) => {
                    const active = (settings.abandonedCartReminderRoles || []).includes(role);
                    return (
                      <button key={role} type="button"
                        onClick={() => {
                          const current = settings.abandonedCartReminderRoles || [];
                          handleChange("abandonedCartReminderRoles", active ? current.filter(r => r !== role) : [...current, role]);
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-indigo-50"}`}>
                        {active ? <CheckCircle2 size={12} /> : <span className="w-3 h-3 rounded-full border border-current inline-block" />}
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingSection>

      {/* ── Guest Browsing ─────────────────────────────────────────────── */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="guest-browsing"
        icon={Package} iconColor="text-green-500" title="Public Shop / Guest Browsing"
        subtitle={guestBrowsing ? "ON — visitors can browse products without logging in" : "OFF — login required to see products"}>
        <div className="mt-3 space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Allow guest product browsing</p>
              <p className="text-xs text-gray-400 mt-0.5">When ON, visitors can browse your shop at <strong>/</strong> without signing in. They must log in to place orders.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-semibold ${guestBrowsing ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {guestBrowsing ? "ON" : "OFF"}
              </span>
              <button type="button" disabled={guestSaving}
                onClick={toggleGuestBrowsing}
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none disabled:opacity-60 ${guestBrowsing ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${guestBrowsing ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${guestBrowsing ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"}`}>
            <span className="text-lg shrink-0">{guestBrowsing ? "🌐" : "🔒"}</span>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {guestBrowsing
                ? "Your shop is publicly accessible. Anyone can view products and share product links without an account."
                : "Your shop is private. Visitors must sign in before they can see any products."}
            </p>
          </div>
        </div>
      </SettingSection>

      {/* ── Maintenance Mode ───────────────────────────────────────────────── */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="maintenance"
        icon={Settings2} iconColor="text-amber-500"
        title="Maintenance Mode"
        subtitle={maintenance.maintenanceMode ? "⚠️ ACTIVE — app is in maintenance" : "OFF — app is running normally"}
        badge={maintenance.maintenanceMode ? "ACTIVE" : undefined}>
        <div className="mt-3 space-y-4">
          {/* Warning banner when active */}
          {maintenance.maintenanceMode && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Maintenance mode is ON</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  All non-admin users are blocked from logging in. Logged-in users have received a notification and will be auto-logged-out shortly.
                </p>
              </div>
            </div>
          )}

          {/* What this does info */}
          {!maintenance.maintenanceMode && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">What happens when you enable maintenance mode:</p>
              <ul className="space-y-1">
                {[
                  "📢 All logged-in users see an in-app notification immediately",
                  "📧 Users receive an email explaining the maintenance",
                  "🔒 New logins are blocked — users see the maintenance message",
                  "⏱️ Logged-in users are auto-logged-out (payment completions are protected)",
                  "🛑 Guest browsing is also disabled",
                ].map(line => (
                  <li key={line} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                    <span className="shrink-0">{line.slice(0,2)}</span>
                    <span>{line.slice(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Message input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Maintenance message <span className="normal-case font-normal text-gray-400">(shown to users)</span>
            </label>
            <textarea
              rows={3}
              value={maintenance.maintenanceModeMessage}
              onChange={(e) => setMaintenance(p => ({ ...p, maintenanceModeMessage: e.target.value }))}
              placeholder="e.g. We are performing scheduled maintenance to improve your experience. We'll be back shortly."
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 dark:bg-gray-900
                dark:text-gray-100 dark:placeholder-gray-500 resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">Leave blank to use the default message.</p>
          </div>

          {/* Toggle button */}
          <div className="flex gap-3">
            {!maintenance.maintenanceMode ? (
              <button type="button" disabled={maintSaving}
                onClick={() => {
                  if (!confirm("Enable maintenance mode? All users will be notified and logged out.")) return;
                  saveMaintenance(true, maintenance.maintenanceModeMessage);
                }}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-amber-500 hover:bg-amber-600
                  disabled:opacity-60 transition shadow-sm flex items-center justify-center gap-2">
                {maintSaving ? <><RefreshCw size={14} className="animate-spin" />Enabling…</> : "⚠️ Enable Maintenance Mode"}
              </button>
            ) : (
              <button type="button" disabled={maintSaving}
                onClick={() => saveMaintenance(false, maintenance.maintenanceModeMessage)}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-green-600 hover:bg-green-700
                  disabled:opacity-60 transition shadow-sm flex items-center justify-center gap-2">
                {maintSaving ? <><RefreshCw size={14} className="animate-spin" />Disabling…</> : "✅ Disable Maintenance Mode — Resume Normal Operation"}
              </button>
            )}
          </div>
        </div>
      </SettingSection>

      {/* ── Floating Calculator ─────────────────────────────────────────────── */}
      <SettingSection openSection={openSection} onToggle={toggleSection} id="calculator"
        icon={Calculator} iconColor="text-emerald-500"
        title="Floating Calculator"
        subtitle={calcEnabled ? "ON — visible on all pages" : "OFF"}>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Show calculator button</p>
              <p className="text-xs text-gray-400 mt-0.5">
                A green 🧮 button floats bottom-left on every page. Great for quick price and quantity calculations.
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
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">Calculator features:</p>
            <ul className="space-y-0.5">
              {[
                "Standard arithmetic (+ − × ÷)",
                "×Qty shortcut — multiply price by quantity instantly",
                "Margin% shortcut — calculate selling price from cost + margin",
                "Last 10 calculations history",
                "Memory store (M+ / MR / MC)",
              ].map(f => (
                <li key={f} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-emerald-500 dark:text-emerald-500 mt-2">
              This preference is saved on this device only.
            </p>
          </div>
        </div>
      </SettingSection>

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

