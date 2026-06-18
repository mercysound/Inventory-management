import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import {
  Clock, Mail, RefreshCw, Save, AlertTriangle, CheckCircle2,
} from "lucide-react";

const SettingsPage = () => {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [settings, setSettings] = useState({
    orderExpiryHours:       48,
    reminderMode:           "repeat",
    reminderIntervalHours:  6,
    storeName:              "Melech Store",
    adminNotificationEmail: "",
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/settings");
      if (res.data.success) {
        const s = res.data.settings;
        setSettings({
          orderExpiryHours:       s.orderExpiryHours       ?? 48,
          reminderMode:           s.reminderMode           ?? "repeat",
          reminderIntervalHours:  s.reminderIntervalHours  ?? 6,
          storeName:              s.storeName              ?? "Melech Store",
          adminNotificationEmail: s.adminNotificationEmail ?? "",
        });
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
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
                onChange={(e) => handleChange("orderExpiryHours", Number(e.target.value))}
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
                  onChange={(e) => handleChange("reminderIntervalHours", Number(e.target.value))}
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
