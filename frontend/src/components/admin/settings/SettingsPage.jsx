import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import {
  Clock, Mail, RefreshCw, Save, AlertTriangle, CheckCircle2,
  Users, ShieldCheck, X, UserCheck, Loader2, Palette, Moon, Sun,
} from "lucide-react";
import { useTheme, GLOBAL_THEMES } from "../../../context/ThemeContext";

const SettingsPage = () => {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const { globalTheme, setGlobalTheme } = useTheme();
  const [settings, setSettings] = useState({
    orderExpiryHours:           48,
    reminderMode:               "repeat",
    reminderIntervalHours:      6,
    storeName:                  "Melech Store",
    adminNotificationEmail:     "",
    lowStockThreshold:          10,
    productExpiryWarningWeeks:  3,
  });

  // ── Delegation state ──────────────────────────────────────────────────────
  const [delegation,       setDelegation]       = useState({ delegateToAllStaff: false, delegatedStaffIds: [] });
  const [delegationLoading, setDelegationLoading] = useState(true);
  const [delegationSaving,  setDelegationSaving]  = useState(false);
  // All staff fetched for the picker
  const [allStaff,         setAllStaff]         = useState([]);
  const [staffLoading,     setStaffLoading]     = useState(false);
  // UI state for the "Add specific staff" picker
  const [showPicker,       setShowPicker]       = useState(false);
  const [pickerSearch,     setPickerSearch]     = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/settings");
      if (res.data.success) {
        const s = res.data.settings;
        setSettings({
          orderExpiryHours:           s.orderExpiryHours           ?? 48,
          reminderMode:               s.reminderMode               ?? "repeat",
          reminderIntervalHours:      s.reminderIntervalHours      ?? 6,
          storeName:                  s.storeName                  ?? "Melech Store",
          adminNotificationEmail:     s.adminNotificationEmail     ?? "",
          lowStockThreshold:          s.lowStockThreshold          ?? 10,
          productExpiryWarningWeeks:  s.productExpiryWarningWeeks  ?? 3,
        });
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
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
    } catch {
      // silently fail — delegation panel shows empty state
    } finally {
      setDelegationLoading(false);
    }
  }, []);

  const fetchAllStaff = useCallback(async () => {
    if (allStaff.length > 0) return; // cached
    try {
      setStaffLoading(true);
      const res = await axiosInstance.get("/users");
      if (res.data.users) {
        setAllStaff(res.data.users.filter((u) => u.role === "staff" && u.isActive !== false));
      }
    } catch {
      toast.error("Failed to load staff list");
    } finally {
      setStaffLoading(false);
    }
  }, [allStaff.length]);

  useEffect(() => {
    fetchSettings();
    fetchDelegation();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  // ── Delegation helpers ────────────────────────────────────────────────────
  const handleDelegationSave = async (patch) => {
    setDelegationSaving(true);
    try {
      const res = await axiosInstance.put("/settings/delegation", patch);
      if (res.data.success) {
        setDelegation({
          delegateToAllStaff: res.data.delegateToAllStaff ?? false,
          delegatedStaffIds:  res.data.delegatedStaffIds  ?? [],
        });
        toast.success("Delegation settings saved. Staff have been notified by email.");
        // Broadcast so any open staff Sidebar refreshes instantly
        window.dispatchEvent(new CustomEvent("delegationChanged"));
      }
    } catch {
      toast.error("Failed to save delegation settings");
    } finally {
      setDelegationSaving(false);
    }
  };

  const toggleDelegateAll = () => {
    const next = !delegation.delegateToAllStaff;
    handleDelegationSave({ delegateToAllStaff: next, delegatedStaffIds: next ? [] : delegation.delegatedStaffIds.map((u) => u._id || u) });
  };

  const addStaffDelegate = (staffId) => {
    const currentIds = delegation.delegatedStaffIds.map((u) => u._id || String(u));
    if (currentIds.includes(staffId)) return;
    const newIds = [...currentIds, staffId];
    handleDelegationSave({ delegateToAllStaff: false, delegatedStaffIds: newIds });
    setShowPicker(false);
    setPickerSearch("");
  };

  const removeStaffDelegate = (staffId) => {
    const newIds = delegation.delegatedStaffIds
      .map((u) => u._id || String(u))
      .filter((id) => id !== staffId);
    handleDelegationSave({ delegateToAllStaff: false, delegatedStaffIds: newIds });
  };

  const handleSave = async () => {
    if (!settings.orderExpiryHours || settings.orderExpiryHours < 1) {
      toast.error("Expiry hours must be at least 1");
      return;
    }
    if (settings.reminderMode === "repeat" && settings.reminderIntervalHours < 1) {
      toast.error("Reminder interval must be at least 1 hour");
      return;
    }
    if (!settings.lowStockThreshold || settings.lowStockThreshold < 1) {
      toast.error("Low stock threshold must be at least 1");
      return;
    }
    if (!settings.productExpiryWarningWeeks || settings.productExpiryWarningWeeks < 1) {
      toast.error("Expiry warning must be at least 1 week");
      return;
    }
    setSaving(true);
    try {
      const res = await axiosInstance.put("/settings", settings);
      if (res.data.success) {
        toast.success("Settings saved successfully!");
        setSaved(true);
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ App Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure global preferences. Settings are saved per admin account and persist across all devices.
        </p>
      </div>

      {/* Store Info */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">🏪 Store Information</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Store Name
          </label>
          <input
            type="text"
            value={settings.storeName}
            onChange={(e) => handleChange("storeName", e.target.value)}
            placeholder="e.g. Melech Store"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">Used in email notifications and receipts.</p>
        </div>
      </motion.div>

      {/* Order Expiry */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          Order Pickup Expiry
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          When a paid order exceeds this time limit without being picked up, you are notified by email
          and it appears on the Expiring Orders page.
        </p>

        <div className="space-y-5">
          {/* Expiry hours */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Expiry Threshold (hours)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} max={720}
                value={settings.orderExpiryHours}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") { handleChange("orderExpiryHours", ""); return; }
                  const n = parseInt(raw, 10);
                  if (isNaN(n) || n < 0) return;
                  handleChange("orderExpiryHours", n);
                }}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (isNaN(n) || n < 1) handleChange("orderExpiryHours", 1);
                }}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 text-center font-semibold"
              />
              <span className="text-sm text-gray-500">hours after order placement</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Example: 48 = you are notified if an order is not picked up within 2 days.
            </p>
          </div>

          {/* Reminder mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Email Reminder Mode
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                {
                  value: "once",
                  label: "One-time only",
                  desc:  "Send a single email when the order first expires. No further reminders.",
                  icon:  "📧",
                },
                {
                  value: "repeat",
                  label: "Repeat reminders",
                  desc:  "Keep sending reminder emails every X hours until the order is resolved.",
                  icon:  "🔁",
                },
              ].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => handleChange("reminderMode", opt.value)}
                  className={`flex-1 text-left p-4 rounded-xl border-2 transition-all ${
                    settings.reminderMode === opt.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{opt.icon}</span>
                    <span className={`text-sm font-semibold ${settings.reminderMode === opt.value ? "text-indigo-700" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                    {settings.reminderMode === opt.value && (
                      <CheckCircle2 size={14} className="text-indigo-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Reminder interval — repeat mode only */}
          {settings.reminderMode === "repeat" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Reminder Interval (hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min={1} max={168}
                  value={settings.reminderIntervalHours}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") { handleChange("reminderIntervalHours", ""); return; }
                    const n = parseInt(raw, 10);
                    if (isNaN(n) || n < 0) return;
                    handleChange("reminderIntervalHours", n);
                  }}
                  onBlur={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (isNaN(n) || n < 1) handleChange("reminderIntervalHours", 1);
                  }}
                  className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 text-center font-semibold"
                />
                <span className="text-sm text-gray-500">hours between each reminder</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Example: 6 = a reminder email every 6 hours for each unresolved expired order.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Notification Email */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Mail size={16} className="text-blue-500" />
          Admin Notification Email
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          All admin notifications are sent here — new customer/wholesale orders placed, order expiry alerts, and expiry reminders.
          Leave blank to use your admin account email.
        </p>
        <input
          type="email"
          value={settings.adminNotificationEmail}
          onChange={(e) => handleChange("adminNotificationEmail", e.target.value)}
          placeholder="admin@yourdomain.com"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
        />
        <p className="text-xs text-gray-400 mt-1.5">
          💡 Covers: new order alerts, expiry alerts, and repeat reminders.
        </p>
      </motion.div>

      {/* ── Staff Order Delegation ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-500" />
          Staff Order Management Delegation
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Grant staff the ability to search, view, and update placed order statuses
          (including delivering and cancelling). Delegated staff will see a "Placed Orders"
          item in their sidebar and receive an email notification when access changes.
        </p>

        {delegationLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <Loader2 size={15} className="animate-spin" /> Loading delegation settings…
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mode selector */}
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                {
                  value: true,
                  label: "All Staff",
                  desc:  "Every active staff member can manage placed orders.",
                  icon:  "👥",
                },
                {
                  value: false,
                  label: "Specific Staff Only",
                  desc:  "You choose which staff members have access.",
                  icon:  "🎯",
                },
              ].map((opt) => (
                <button key={String(opt.value)} type="button"
                  onClick={() => {
                    if (opt.value !== delegation.delegateToAllStaff) toggleDelegateAll();
                  }}
                  disabled={delegationSaving}
                  className={`flex-1 text-left p-4 rounded-xl border-2 transition-all disabled:opacity-60 ${
                    delegation.delegateToAllStaff === opt.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{opt.icon}</span>
                    <span className={`text-sm font-semibold ${delegation.delegateToAllStaff === opt.value ? "text-indigo-700" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                    {delegation.delegateToAllStaff === opt.value && (
                      <CheckCircle2 size={14} className="text-indigo-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Specific staff list — only shown when NOT delegating to all */}
            {!delegation.delegateToAllStaff && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Delegated Staff ({delegation.delegatedStaffIds.length})
                  </p>
                  <button
                    onClick={() => { setShowPicker((p) => !p); fetchAllStaff(); }}
                    disabled={delegationSaving}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50 transition"
                  >
                    <UserCheck size={13} /> Add Staff
                  </button>
                </div>

                {/* Current delegates */}
                {delegation.delegatedStaffIds.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    No staff delegated yet. Click "Add Staff" to grant access to specific staff.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {delegation.delegatedStaffIds.map((s) => {
                      const id   = s._id   || String(s);
                      const name = s.name  || "Staff Member";
                      const email= s.email || "";
                      return (
                        <li key={id}
                          className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-indigo-500" />
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{name}</p>
                              {email && <p className="text-xs text-gray-400">{email}</p>}
                            </div>
                          </div>
                          <button
                            onClick={() => removeStaffDelegate(id)}
                            disabled={delegationSaving}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                            title="Remove delegation"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Staff picker dropdown */}
                <AnimatePresence>
                  {showPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="border border-gray-200 rounded-xl shadow-md bg-white overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-100">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search staff by name or email…"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {staffLoading ? (
                          <div className="flex items-center gap-2 p-3 text-gray-400 text-xs">
                            <Loader2 size={13} className="animate-spin" /> Loading staff…
                          </div>
                        ) : (
                          (() => {
                            const delegatedIds = delegation.delegatedStaffIds.map((u) => u._id || String(u));
                            const filtered = allStaff.filter((s) =>
                              !delegatedIds.includes(String(s._id)) &&
                              (!pickerSearch || s.name?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                               s.email?.toLowerCase().includes(pickerSearch.toLowerCase()))
                            );
                            if (filtered.length === 0) {
                              return (
                                <p className="text-xs text-gray-400 p-3 text-center">
                                  {allStaff.length === 0 ? "No active staff found." : "All staff are already delegated or no match."}
                                </p>
                              );
                            }
                            return filtered.map((s) => (
                              <button key={s._id} type="button"
                                onClick={() => addStaffDelegate(String(s._id))}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 transition"
                              >
                                <Users size={14} className="text-gray-400 shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                  <p className="text-xs text-gray-400">{s.email}</p>
                                </div>
                              </button>
                            ));
                          })()
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* All-staff mode active indicator */}
            {delegation.delegateToAllStaff && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-800">
                  All active staff can currently manage placed orders.
                  Switch to "Specific Staff Only" to restrict access.
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Inventory Alerts ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          Inventory Alerts
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Configure the thresholds that trigger notifications so you always know when to restock or pull expiring items.
        </p>

        <div className="space-y-5">
          {/* Low stock threshold */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Low Stock Alert Threshold (units)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} max={10000}
                value={settings.lowStockThreshold}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") { handleChange("lowStockThreshold", ""); return; }
                  const n = parseInt(raw, 10);
                  if (isNaN(n) || n < 0) return;
                  handleChange("lowStockThreshold", n);
                }}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (isNaN(n) || n < 1) handleChange("lowStockThreshold", 1);
                }}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-gray-50 text-center font-semibold"
              />
              <span className="text-sm text-gray-500">units remaining</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Minimum is 1. The dashboard and product list will highlight products at or below this count.
            </p>
          </div>

          {/* Product expiry warning */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Product Expiry Warning (weeks before)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} max={52}
                value={settings.productExpiryWarningWeeks}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") { handleChange("productExpiryWarningWeeks", ""); return; }
                  const n = parseInt(raw, 10);
                  if (isNaN(n) || n < 0) return;
                  handleChange("productExpiryWarningWeeks", n);
                }}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (isNaN(n) || n < 1) handleChange("productExpiryWarningWeeks", 1);
                }}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-gray-50 text-center font-semibold"
              />
              <span className="text-sm text-gray-500">weeks before expiry date</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Default is 3 weeks. You receive a daily digest email listing all products expiring within this window.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Appearance ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Palette size={16} className="text-indigo-500" />
          Global App Theme
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Chose a colour palette that applies to every user in the store — staff, customers and wholesale partners
          all see the same brand colours. Changes take effect immediately for everyone on their next page load.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GLOBAL_THEMES.map((t) => {
            const active = globalTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setGlobalTheme(t.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  active
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                {/* Colour swatch */}
                <span
                  className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-sm"
                  style={{ background: t.color }}
                >
                  {active && <CheckCircle2 size={16} className="text-white" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${active ? "text-indigo-700" : "text-gray-800"}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-indigo-700">
          <Palette size={13} />
          Currently active: <strong className="ml-1">{GLOBAL_THEMES.find((t) => t.id === globalTheme)?.label}</strong>
          <span className="ml-1 text-indigo-400">— theme saves automatically when you click a swatch</span>
        </div>
      </motion.div>

      {/* Product Draft Info */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
        <span className="text-xl">📋</span>
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-semibold mb-0.5">Product form draft</p>
          <p>
            When you start filling the Add Product form and close it without saving,
            your progress is automatically saved to your account — not just this device.
            You can continue on any device you log into as admin.
            The draft is cleared automatically when you successfully add the product.
          </p>
        </div>
      </motion.div>

      {/* How it works */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
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
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition shadow-sm">
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-sm text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={14} /> Saved
          </motion.span>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
