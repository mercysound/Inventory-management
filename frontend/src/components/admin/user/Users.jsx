import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import { useAuth } from "../../../context/AuthContext";
import UsersTable from "./UsersTable";
import AddUserPanel from "./AddUserPanel";
import EmailBroadcastPanel from "./EmailBroadcastPanel";
import EditUserModal from "./EditUserModal";

const TABS = [
  { id: "list",  label: "Users",  icon: "👥" },
  { id: "add",   label: "Add",    icon: "➕" },
  { id: "email", label: "Email",  icon: "✉️" },
];

// ✅ Wholesale role color added
export const roleColors = {
  admin:     { bg: "#f3f0ff", text: "#6d28d9", border: "#ddd6fe" },
  staff:     { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  customer:  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  wholesale: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
};

export default function Users() {
  const { user: adminUser } = useAuth();
  const currentAdminId = adminUser?._id || adminUser?.id || "";

  const [activeTab,   setActiveTab]   = useState("list");
  const [users,       setUsers]       = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [roleFilter,  setRoleFilter]  = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget,  setEditTarget]  = useState(null);
  const [sortConfig,  setSortConfig]  = useState({ key: "name", dir: "asc" });

  // ── Single-user suspend confirmation state ────────────────────────────────
  const [suspendTarget,  setSuspendTarget]  = useState(null); // { user, activate }
  const [suspendReason,  setSuspendReason]  = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/users");
      setUsers(res.data.users);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    let list = [...users];
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (searchQuery) list = list.filter((u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    list.sort((a, b) => {
      const va = (a[sortConfig.key] || "").toString().toLowerCase();
      const vb = (b[sortConfig.key] || "").toString().toLowerCase();
      return sortConfig.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    setFiltered(list);
  }, [users, roleFilter, searchQuery, sortConfig]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      const res = await axiosInstance.delete(`/users/${id}`);
      if (res.data.success) { toast.success("User deleted"); fetchUsers(); }
    } catch { toast.error("Delete failed."); }
  };

  // ── Single toggle — opens confirmation modal ──────────────────────────────
  const handleToggleStatus = (user, activate) => {
    setSuspendTarget({ user, activate });
    setSuspendReason("");
  };

  // ── Confirm single suspend/activate ──────────────────────────────────────
  const confirmToggleStatus = async () => {
    if (!suspendTarget) return;
    const { user, activate } = suspendTarget;
    setSuspendLoading(true);
    try {
      const res = await axiosInstance.patch(`/users/${user._id}/status`, {
        isActive: activate,
        reason:   suspendReason.trim() || undefined,
      });
      if (res.data.success) {
        toast.success(activate ? `${user.name} has been reactivated.` : `${user.name} has been suspended.`);
        // Optimistic local update — no full re-fetch needed
        setUsers((prev) => prev.map((u) =>
          u._id === user._id ? { ...u, isActive: activate } : u
        ));
        setSuspendTarget(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update user status.");
    } finally {
      setSuspendLoading(false);
    }
  };

  // ── Bulk toggle — called directly from UsersTable after its own confirm ───
  const handleBulkToggleStatus = async (ids, activate, reason) => {
    try {
      const res = await axiosInstance.post("/users/bulk-status", {
        userIds:  ids,
        isActive: activate,
        reason:   reason || undefined,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        // Optimistic local update
        setUsers((prev) => prev.map((u) =>
          ids.includes(u._id) ? { ...u, isActive: activate } : u
        ));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update user statuses.");
    }
  };

  // Counts per role for the filter pill badges
  const counts = users.reduce((a, u) => { a[u.role] = (a[u.role] || 0) + 1; return a; }, {});

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        .um-page{
          padding:16px 12px 64px;
          max-width:1200px;margin:0 auto;
          font-family:'Outfit','DM Sans',system-ui,sans-serif;
          min-height:100vh;background:#f8fafc;
        }
        .um-header{display:flex;flex-direction:column;gap:12px;margin-bottom:18px;}
        .um-title-row{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;}
        .um-h1{font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.03em;margin:0 0 3px;}
        .um-subtitle{font-size:12px;color:#94a3b8;margin:0;}
        .um-stats{display:flex;gap:7px;flex-wrap:wrap;}
        .um-stat-pill{display:flex;flex-direction:column;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:7px 12px;min-width:52px;}
        .um-stat-num{font-size:17px;font-weight:800;font-family:'DM Mono',monospace;line-height:1;}
        .um-stat-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;}
        .um-tabbar{display:flex;gap:3px;background:#f1f5f9;border-radius:12px;padding:3px;margin-bottom:16px;width:100%;}
        .um-tab{flex:1;border:none;border-radius:9px;padding:9px 6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .18s;white-space:nowrap;}
        .um-tab-lbl{display:none;}
        @media(min-width:480px){
          .um-page{padding:20px 18px 64px;}
          .um-h1{font-size:22px;}
          .um-tab-lbl{display:inline;}
          .um-tabbar{width:fit-content;}
          .um-tab{flex:none;padding:9px 18px;}
        }
        @media(min-width:768px){
          .um-page{padding:28px 24px 64px;}
          .um-header{flex-direction:row;justify-content:space-between;align-items:flex-start;}
          .um-h1{font-size:26px;}
          .um-stat-num{font-size:20px;}
          .um-stat-pill{padding:8px 16px;min-width:60px;}
        }
      `}</style>

      <div className="um-page">
        <div className="um-header">
          <div className="um-title-row">
            <div>
              <h1 className="um-h1">User Management</h1>
              <p className="um-subtitle">Manage team members, customers, wholesale partners and communications</p>
            </div>
          </div>
          {/* Stats pills — now includes wholesale */}
          <div className="um-stats">
            {[
              { label: "Total",     value: users.length,                                  color: "#64748b" },
              { label: "Admins",    value: counts.admin     || 0,                         color: "#7c3aed" },
              { label: "Staff",     value: counts.staff     || 0,                         color: "#2563eb" },
              { label: "Customers", value: counts.customer  || 0,                         color: "#16a34a" },
              { label: "Wholesale", value: counts.wholesale || 0,                         color: "#92400e" },
              { label: "Suspended", value: users.filter((u) => u.isActive === false).length, color: "#dc2626" },
            ].map((s) => (
              <div key={s.label} className="um-stat-pill">
                <span className="um-stat-num" style={{ color: s.color }}>{s.value}</span>
                <span className="um-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="um-tabbar" role="tablist">
          {TABS.map((tab) => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)} className="um-tab"
              style={{
                background: activeTab === tab.id ? "#0f172a" : "transparent",
                color:      activeTab === tab.id ? "#fff" : "#64748b",
              }}>
              <span>{tab.icon}</span>
              <span className="um-tab-lbl">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}>
            {activeTab === "list" && (
              <UsersTable
                users={filtered}
                loading={loading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                sortConfig={sortConfig}
                onSort={(k) => setSortConfig((p) => ({ key: k, dir: p.key === k && p.dir === "asc" ? "desc" : "asc" }))}
                onDelete={handleDelete}
                onEdit={(u) => setEditTarget(u)}
                onToggleStatus={handleToggleStatus}
                onBulkToggleStatus={handleBulkToggleStatus}
                roleColors={roleColors}
                currentAdminId={currentAdminId}
              />
            )}
            {activeTab === "add"   && <AddUserPanel onSuccess={() => { fetchUsers(); setActiveTab("list"); }} />}
            {activeTab === "email" && <EmailBroadcastPanel users={users} roleColors={roleColors} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editTarget && (
          <EditUserModal
            user={editTarget}
            onClose={() => setEditTarget(null)}
            onSuccess={() => { fetchUsers(); setEditTarget(null); }}
          />
        )}
      </AnimatePresence>

      {/* ── Single-user Suspend / Activate confirmation modal ── */}
      <AnimatePresence>
        {suspendTarget && createPortal(
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget && !suspendLoading) setSuspendTarget(null); }}
            style={{
              position: "fixed", inset: 0, background: "rgba(15,23,42,.55)",
              zIndex: 9999, display: "flex", alignItems: "center",
              justifyContent: "center", padding: "16px", backdropFilter: "blur(3px)",
            }}>
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff", borderRadius: 18, width: "100%", maxWidth: 440,
                boxShadow: "0 24px 64px rgba(0,0,0,.2)", overflow: "hidden",
                maxHeight: "calc(100dvh - 32px)", display: "flex", flexDirection: "column",
              }}>
              {/* Header */}
              <div style={{
                background: suspendTarget.activate ? "#16a34a" : "#dc2626",
                padding: "20px 24px",
              }}>
                <p style={{ margin: 0, color: "#fff", fontSize: 17, fontWeight: 800 }}>
                  {suspendTarget.activate ? "▶ Reactivate Account" : "⏸ Suspend Account"}
                </p>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.8)", fontSize: 12 }}>
                  {suspendTarget.user.name} · {suspendTarget.user.email}
                </p>
              </div>

              {/* Body */}
              <div style={{ padding: "20px 24px" }}>
                {suspendTarget.activate ? (
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 16px" }}>
                    This will <strong>restore full access</strong> for this user. They will be able
                    to log in immediately and will receive a reactivation email.
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 12px" }}>
                      This will <strong>block all access</strong> for this user. They will be
                      signed out on their next request and will receive a notification email.
                    </p>
                    <p style={{
                      fontSize: 12, background: "#fef3c7", border: "1px solid #fde68a",
                      borderRadius: 8, padding: "8px 12px", color: "#92400e", margin: "0 0 16px",
                    }}>
                      ℹ️ Any active session finishes gracefully — their current page action
                      completes before the block takes effect.
                    </p>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                      Reason <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional — included in email)</span>
                    </label>
                    <textarea
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="e.g. App undergoing price updates, maintenance mode, security review…"
                      rows={3}
                      style={{
                        width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0",
                        borderRadius: 9, fontSize: 13, fontFamily: "inherit",
                        background: "#f8fafc", outline: "none", resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                display: "flex", gap: 10, padding: "0 24px 20px",
                justifyContent: "flex-end",
              }}>
                <button
                  onClick={() => setSuspendTarget(null)}
                  disabled={suspendLoading}
                  style={{
                    background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0",
                    borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                  Cancel
                </button>
                <button
                  onClick={confirmToggleStatus}
                  disabled={suspendLoading}
                  style={{
                    background: suspendTarget.activate ? "#16a34a" : "#dc2626",
                    color: "#fff", border: "none", borderRadius: 9,
                    padding: "9px 24px", fontSize: 13, fontWeight: 700,
                    cursor: suspendLoading ? "not-allowed" : "pointer",
                    fontFamily: "inherit", opacity: suspendLoading ? 0.7 : 1,
                  }}>
                  {suspendLoading
                    ? "Processing…"
                    : suspendTarget.activate ? "▶ Reactivate" : "⏸ Suspend"
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}
