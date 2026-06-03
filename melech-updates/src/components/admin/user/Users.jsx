import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
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
  const [activeTab,   setActiveTab]   = useState("list");
  const [users,       setUsers]       = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [roleFilter,  setRoleFilter]  = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget,  setEditTarget]  = useState(null);
  const [sortConfig,  setSortConfig]  = useState({ key: "name", dir: "asc" });

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
              { label: "Total",     value: users.length,             color: "#64748b" },
              { label: "Admins",    value: counts.admin    || 0,     color: "#7c3aed" },
              { label: "Staff",     value: counts.staff    || 0,     color: "#2563eb" },
              { label: "Customers", value: counts.customer  || 0,    color: "#16a34a" },
              { label: "Wholesale", value: counts.wholesale || 0,    color: "#92400e" },
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
                roleColors={roleColors}
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
    </>
  );
}
