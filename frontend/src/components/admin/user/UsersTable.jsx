import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PAGE_SIZE = 15;

const Avatar = ({ name, size = 34, dimmed = false }) => {
  const initials = name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const hue = [...(name || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: dimmed ? "#e2e8f0" : `hsl(${hue},55%,88%)`,
      color:      dimmed ? "#94a3b8" : `hsl(${hue},55%,35%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
      fontFamily: "'DM Mono',monospace",
      opacity: dimmed ? 0.7 : 1,
    }}>
      {initials}
    </div>
  );
};

const SortIcon = ({ active, dir }) => (
  <span style={{ opacity: active ? 1 : 0.35, fontSize: 10, marginLeft: 3 }}>
    {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
  </span>
);

const SkeletonRows = () => (
  <>
    {[...Array(5)].map((_, i) => (
      <tr key={i}>
        {[...Array(7)].map((_, j) => (
          <td key={j} style={{ padding: "12px 14px" }}>
            <div style={{
              height: 13, background: "#f1f5f9", borderRadius: 6,
              width: j === 0 ? "20px" : j === 2 ? "75%" : "55%",
              animation: "ut-shimmer 1.4s infinite",
            }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

const StatusBadge = ({ isActive }) =>
  isActive === false ? (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#fef2f2", color: "#dc2626",
      border: "1px solid #fecaca", borderRadius: 20,
      fontSize: 10, fontWeight: 700, padding: "2px 8px",
    }}>
      ⏸ Suspended
    </span>
  ) : (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#f0fdf4", color: "#16a34a",
      border: "1px solid #bbf7d0", borderRadius: 20,
      fontSize: 10, fontWeight: 700, padding: "2px 8px",
    }}>
      ✓ Active
    </span>
  );

// Shared pagination button style helper
const pgBtn = (disabled, active = false) => ({
  padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
  border: active ? "none" : "1px solid #e2e8f0",
  background: active ? "#0f172a" : disabled ? "#f8fafc" : "#fff",
  color: active ? "#fff" : disabled ? "#cbd5e1" : "#374151",
  transition: "all .15s",
});

export default function UsersTable({
  users, loading, searchQuery, setSearchQuery,
  roleFilter, setRoleFilter, sortConfig, onSort,
  onDelete, onEdit, onToggleStatus, onBulkToggleStatus,
  roleColors, currentAdminId,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkReason,  setBulkReason]  = useState("");
  const [showReason,  setShowReason]  = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever the filtered list changes
  const totalPages  = Math.ceil(users.length / PAGE_SIZE);
  const paginated   = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const cols = [
    { key: "name",  label: "Name"  },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role",  label: "Role"  },
  ];

  // Copy text to clipboard helper
  const copyId = (id) => {
    navigator.clipboard?.writeText(id)
      .then(() => {
        const el = document.getElementById(`uid-copied-${id}`);
        if (el) { el.style.display = "inline"; setTimeout(() => { el.style.display = "none"; }, 1500); }
      })
      .catch(() => {});
  };

  const filterRoles = ["all", "admin", "staff", "customer", "wholesale"];

  // Users that can be selected — admin cannot select themselves
  const selectableUsers = useMemo(
    () => users.filter((u) => u._id !== currentAdminId),
    [users, currentAdminId]
  );

  const allSelected  = selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.has(u._id));
  const someSelected = selectedIds.size > 0;

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableUsers.map((u) => u._id)));
    }
  };

  const clearSelection = () => { setSelectedIds(new Set()); setBulkReason(""); setShowReason(false); };

  const selectedUsers    = users.filter((u) => selectedIds.has(u._id));
  const anyActive        = selectedUsers.some((u) => u.isActive !== false);
  const anyDeactivated   = selectedUsers.some((u) => u.isActive === false);

  const handleBulkAction = (activate) => {
    if (!someSelected) return;
    onBulkToggleStatus([...selectedIds], activate, bulkReason.trim() || null);
    clearSelection();
  };

  return (
    <>
      <style>{`
        @keyframes ut-shimmer{0%,100%{opacity:1}50%{opacity:.4}}
        .ut-wrap{background:#fff;border-radius:14px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.04);overflow:hidden;}
        .ut-toolbar{padding:12px 14px;border-bottom:1px solid #f1f5f9;display:flex;flex-direction:column;gap:10px;}
        .ut-search-wrap{position:relative;display:flex;align-items:center;width:100%;}
        .ut-search-icon{position:absolute;left:11px;font-size:14px;pointer-events:none;}
        .ut-search{width:100%;padding:9px 34px 9px 34px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit;outline:none;background:#f8fafc;}
        .ut-clear{position:absolute;right:9px;background:none;border:none;cursor:pointer;font-size:12px;color:#94a3b8;padding:2px 4px;}
        .ut-filters{display:flex;gap:6px;flex-wrap:wrap;}
        .ut-filter{border-radius:20px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;transition:all .15s;white-space:nowrap;}
        .ut-count-badge{font-size:10px;font-weight:700;border-radius:10px;padding:1px 5px;font-family:'DM Mono',monospace;}
        .ut-result-count{font-size:11px;color:#94a3b8;padding:6px 14px 0;margin:0;}
        .ut-table-wrap{overflow-x:auto;display:none;}
        .ut-table{width:100%;border-collapse:collapse;min-width:680px;}
        .ut-thead{background:#f8fafc;}
        .ut-th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;border-bottom:1px solid #f1f5f9;white-space:nowrap;}
        .ut-sort-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;padding:0;display:flex;align-items:center;}
        .ut-tr{background:#fff;border-bottom:1px solid #f8fafc;transition:background .1s;}
        .ut-tr:hover{background:#f8fafc;}
        .ut-tr-deactivated{background:#fafafa;opacity:.75;}
        .ut-tr-deactivated:hover{background:#f3f4f6;}
        .ut-td{padding:11px 14px;vertical-align:middle;font-size:13px;}
        .ut-role-pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.03em;text-transform:capitalize;}
        .ut-edit-btn{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:7px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:3px;transition:all .15s;white-space:nowrap;}
        .ut-del-btn{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:7px;padding:4px 9px;font-size:12px;cursor:pointer;transition:all .15s;}
        .ut-suspend-btn{background:#fef3c7;color:#b45309;border:1px solid #fde68a;border-radius:7px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;}
        .ut-activate-btn{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:7px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;}
        .ut-empty{text-align:center;padding:48px;color:#94a3b8;font-size:13px;}
        .ut-cards{display:flex;flex-direction:column;gap:10px;padding:12px;}
        .ut-card{border:1px solid #f1f5f9;border-radius:12px;padding:14px;background:#fff;transition:box-shadow .15s;}
        .ut-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.06);}
        .ut-card-deactivated{background:#fafafa;border-color:#e5e7eb;opacity:.8;}
        .ut-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px;}
        .ut-card-info{min-width:0;}
        .ut-card-name{font-size:14px;font-weight:700;color:#0f172a;margin:0 0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ut-card-email{font-size:12px;color:#64748b;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ut-card-meta{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;}
        .ut-card-row{display:flex;gap:6px;font-size:12px;color:#475569;align-items:flex-start;}
        .ut-card-key{font-weight:700;color:#94a3b8;min-width:54px;flex-shrink:0;}
        .ut-card-actions{display:flex;gap:8px;flex-wrap:wrap;}
        .ut-bulk-bar{background:#0f172a;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .ut-bulk-count{font-size:12px;font-weight:700;}
        .ut-bulk-btn{border-radius:7px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;border:none;white-space:nowrap;}
        .ut-bulk-deactivate{background:#fef3c7;color:#92400e;}
        .ut-bulk-activate{background:#d1fae5;color:#065f46;}
        .ut-bulk-clear{background:transparent;color:#94a3b8;border:1px solid #334155 !important;border-radius:7px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit;}
        .ut-reason-input{border:1px solid #334155;border-radius:7px;padding:5px 10px;font-size:11px;font-family:inherit;background:#1e293b;color:#f1f5f9;outline:none;min-width:200px;}
        .ut-reason-input::placeholder{color:#64748b;}
        .ut-cb{width:15px;height:15px;cursor:pointer;accent-color:#6366f1;}
        /* ── Dark mode overrides ── */
        html.dark .ut-wrap{background:#1e2130;border-color:#2d3148;}
        html.dark .ut-toolbar{border-bottom-color:#2d3148;}
        html.dark .ut-search{background:#252840;border-color:#2d3148;color:#e2e8f0;}
        html.dark .ut-search::placeholder{color:#64748b;}
        html.dark .ut-thead{background:#1a1d2e;}
        html.dark .ut-th{color:#64748b;border-bottom-color:#2d3148;}
        html.dark .ut-tr{background:#1e2130;border-bottom-color:#252840;}
        html.dark .ut-tr:hover{background:#252840;}
        html.dark .ut-tr-deactivated{background:#1a1d2e;}
        html.dark .ut-td{color:#cbd5e1;border-color:#252840;}
        html.dark .ut-card{background:#1e2130;border-color:#2d3148;}
        html.dark .ut-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.5);}
        html.dark .ut-card-deactivated{background:#1a1d2e;border-color:#252840;}
        html.dark .ut-card-name{color:#e2e8f0;}
        html.dark .ut-card-email{color:#8892a4;}
        html.dark .ut-card-row{color:#8892a4;}
        html.dark .ut-result-count{color:#64748b;}
        html.dark .ut-empty{color:#64748b;}
        html.dark .ut-edit-btn{background:#1e3a5f;color:#93c5fd;border-color:#1d4ed8;}
        html.dark .ut-del-btn{background:#3b1212;color:#f87171;border-color:#7f1d1d;}
        html.dark .ut-suspend-btn{background:#3b2a00;color:#fbbf24;border-color:#92400e;}
        html.dark .ut-activate-btn{background:#0d2e1a;color:#4ade80;border-color:#166534;}
        html.dark .ut-bulk-bar{background:#0f172a;}
        @media(min-width:640px){
          .ut-toolbar{flex-direction:row;align-items:center;padding:14px 18px;}
          .ut-search-wrap{max-width:280px;}
          .ut-table-wrap{display:block;}
          .ut-cards{display:none;}
          .ut-result-count{padding:8px 18px 0;}
        }
        @media(min-width:768px){
          .ut-toolbar{padding:16px 20px;}
          .ut-th{padding:11px 16px;}
          .ut-td{padding:12px 16px;}
        }
      `}</style>

      <div className="ut-wrap">

        {/* ── Toolbar ── */}
        <div className="ut-toolbar">
          <div className="ut-search-wrap">
            <span className="ut-search-icon">🔍</span>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or email…" className="ut-search" aria-label="Search users" />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="ut-clear">✕</button>}
          </div>
          <div className="ut-filters" role="group" aria-label="Filter by role">
            {filterRoles.map((r) => (
              <button key={r} onClick={() => setRoleFilter(r)} className="ut-filter"
                style={{
                  background: roleFilter === r ? "#0f172a" : "#fff",
                  color:      roleFilter === r ? "#fff"    : "#64748b",
                  border:     `1px solid ${roleFilter === r ? "#0f172a" : "#e2e8f0"}`,
                }}>
                {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                {r !== "all" && (
                  <span className="ut-count-badge" style={{
                    background: roleFilter === r ? "rgba(255,255,255,.18)" : (roleColors[r]?.bg  || "#f1f5f9"),
                    color:      roleFilter === r ? "#fff"                  : (roleColors[r]?.text || "#64748b"),
                  }}>
                    {users.filter((u) => u.role === r).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Bulk action bar — slides in when users are selected ── */}
        <AnimatePresence>
          {someSelected && (
            <motion.div className="ut-bulk-bar"
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}>
              <span className="ut-bulk-count">
                {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <input
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Reason (optional, sent by email)…"
                className="ut-reason-input"
              />
              {anyActive && (
                <button className="ut-bulk-btn ut-bulk-deactivate"
                  onClick={() => handleBulkAction(false)}>
                  ⏸ Suspend selected
                </button>
              )}
              {anyDeactivated && (
                <button className="ut-bulk-btn ut-bulk-activate"
                  onClick={() => handleBulkAction(true)}>
                  ▶ Reactivate selected
                </button>
              )}
              <button className="ut-bulk-clear" onClick={clearSelection}>✕ Clear</button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="ut-result-count">
          {loading ? "Loading…" : `${users.length} user${users.length !== 1 ? "s" : ""}`}
          {(searchQuery || roleFilter !== "all") && !loading && " (filtered)"}
          {!loading && totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
        </p>

        {/* ── Desktop table ── */}
        <div className="ut-table-wrap">
          <table className="ut-table" aria-label="Users table">
            <thead>
              <tr className="ut-thead">
                {/* Select-all checkbox */}
                <th className="ut-th" style={{ width: 32, paddingRight: 4 }}>
                  <input type="checkbox" className="ut-cb"
                    checked={allSelected} onChange={toggleAll}
                    title="Select all" aria-label="Select all users" />
                </th>
                <th className="ut-th" style={{ width: 36 }}>#</th>
                {cols.map((c) => (
                  <th key={c.key} className="ut-th">
                    <button onClick={() => onSort(c.key)} className="ut-sort-btn">
                      {c.label}<SortIcon active={sortConfig.key === c.key} dir={sortConfig.dir} />
                    </button>
                  </th>
                ))}
                <th className="ut-th">User ID <span style={{ fontWeight: 400, textTransform: "none", fontSize: 9 }}>(click to copy)</span></th>
                <th className="ut-th">Status</th>
                <th className="ut-th" style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="ut-empty">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>No users found
                  </td>
                </tr>
              ) : (
                paginated.map((user, i) => {
                  const isSelf       = user._id === currentAdminId;
                  const isDeactivated = user.isActive === false;
                  const isSelected   = selectedIds.has(user._id);
                  return (
                    <motion.tr key={user._id}
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`ut-tr${isDeactivated ? " ut-tr-deactivated" : ""}`}
                      style={{ background: isSelected ? "#f5f3ff" : undefined }}>
                      {/* Row checkbox */}
                      <td className="ut-td" style={{ paddingRight: 4 }}>
                        {!isSelf && (
                          <input type="checkbox" className="ut-cb"
                            checked={isSelected} onChange={() => toggleOne(user._id)}
                            aria-label={`Select ${user.name}`} />
                        )}
                      </td>
                      <td className="ut-td" style={{ color: "#94a3b8", fontSize: 11 }}>{i + 1}</td>
                      <td className="ut-td">
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={user.name} dimmed={isDeactivated} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: isDeactivated ? "#94a3b8" : "#0f172a" }}>
                              {user.name}
                              {isSelf && <span style={{ fontSize: 10, color: "#6366f1", marginLeft: 5 }}>(you)</span>}
                            </div>
                            <div style={{ fontSize: 10, color: "#94a3b8" }}>
                              {user.profileCompleted ? "✓ Complete" : "Incomplete"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="ut-td">
                        <a href={`mailto:${user.email}`} style={{ color: "#2563eb", textDecoration: "none", fontSize: 12 }}>
                          {user.email}
                        </a>
                      </td>
                      <td className="ut-td" style={{ fontSize: 12 }}>
                        {user.phone || <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td className="ut-td">
                        <span className="ut-role-pill" style={{
                          background: roleColors[user.role]?.bg   || "#f1f5f9",
                          color:      roleColors[user.role]?.text || "#64748b",
                          border:     `1px solid ${roleColors[user.role]?.border || "#e2e8f0"}`,
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td className="ut-td">
                        <StatusBadge isActive={user.isActive} />
                      </td>
                      {/* ── User ID — immutable, copyable ── */}
                      <td className="ut-td" style={{ fontSize: 11 }}>
                        <div
                          title={`Full ID: ${user._id} — click to copy`}
                          onClick={() => copyId(user._id)}
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            color: "#6366f1",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            background: "#f5f3ff",
                            border: "1px solid #ddd6fe",
                            borderRadius: 6,
                            padding: "2px 7px",
                            width: "fit-content",
                            userSelect: "all",
                          }}
                        >
                          ...{String(user._id).slice(-8).toUpperCase()}
                          <span id={`uid-copied-${user._id}`} style={{ display: "none", fontSize: 9, color: "#16a34a", fontWeight: 700 }}>✓</span>
                        </div>
                      </td>
                      <td className="ut-td">
                        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
                          <button onClick={() => onEdit(user)} className="ut-edit-btn">✏️ Edit</button>
                          {!isSelf && (
                            isDeactivated
                              ? <button onClick={() => onToggleStatus(user, true)}  className="ut-activate-btn">▶ Activate</button>
                              : <button onClick={() => onToggleStatus(user, false)} className="ut-suspend-btn">⏸ Suspend</button>
                          )}
                          <button onClick={() => onDelete(user._id)} className="ut-del-btn">🗑</button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="ut-cards">          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="ut-card" style={{ background: "#f8fafc" }}>
                {[...Array(3)].map((_, j) => (
                  <div key={j} style={{
                    height: 13, background: "#e2e8f0", borderRadius: 6,
                    marginBottom: 8, width: j === 0 ? "60%" : "40%",
                    animation: "ut-shimmer 1.4s infinite",
                  }} />
                ))}
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="ut-empty">No users found</div>
          ) : (
            paginated.map((user, i) => {
              const isSelf        = user._id === currentAdminId;
              const isDeactivated = user.isActive === false;
              const isSelected    = selectedIds.has(user._id);
              return (
                <motion.div key={user._id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`ut-card${isDeactivated ? " ut-card-deactivated" : ""}`}
                  style={{ background: isSelected ? "#f5f3ff" : undefined }}>
                  <div className="ut-card-top">
                    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, flex: 1 }}>
                      {/* Mobile checkbox */}
                      {!isSelf && (
                        <input type="checkbox" className="ut-cb" checked={isSelected}
                          onChange={() => toggleOne(user._id)} aria-label={`Select ${user.name}`} />
                      )}
                      <Avatar name={user.name} size={38} dimmed={isDeactivated} />
                      <div className="ut-card-info">
                        <p className="ut-card-name">
                          {user.name}
                          {isSelf && <span style={{ fontSize: 10, color: "#6366f1", marginLeft: 5 }}>(you)</span>}
                        </p>
                        <p className="ut-card-email">{user.email}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                      <span className="ut-role-pill" style={{
                        background: roleColors[user.role]?.bg   || "#f1f5f9",
                        color:      roleColors[user.role]?.text || "#64748b",
                        border:     `1px solid ${roleColors[user.role]?.border || "#e2e8f0"}`,
                      }}>
                        {user.role}
                      </span>
                      <StatusBadge isActive={user.isActive} />
                    </div>
                  </div>
                  {(user.phone || user.address) && (
                    <div className="ut-card-meta">
                      {user.phone   && <div className="ut-card-row"><span className="ut-card-key">Phone</span>{user.phone}</div>}
                      {user.address && <div className="ut-card-row"><span className="ut-card-key">Address</span><span style={{ wordBreak: "break-word" }}>{user.address}</span></div>}
                    </div>
                  )}
                  {/* User ID — immutable, for history filter use */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "#f5f3ff", border: "1px solid #ddd6fe",
                    borderRadius: 8, padding: "5px 10px", marginBottom: 10,
                    flexWrap: "wrap",
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                      User ID
                    </span>
                    <span
                      onClick={() => copyId(user._id)}
                      title="Tap to copy full User ID"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 11, color: "#6366f1",
                        cursor: "pointer", userSelect: "all",
                        wordBreak: "break-all", flex: 1,
                      }}
                    >
                      {String(user._id)}
                    </span>
                    <button
                      onClick={() => copyId(user._id)}
                      style={{
                        background: "#ede9fe", color: "#7c3aed",
                        border: "1px solid #ddd6fe", borderRadius: 6,
                        padding: "2px 8px", fontSize: 10, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                      }}
                    >
                      Copy
                    </button>
                    <span id={`uid-copied-${user._id}`} style={{ display: "none", fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓ Copied!</span>
                  </div>
                  <div className="ut-card-actions">
                    <button onClick={() => onEdit(user)} className="ut-edit-btn" style={{ flex: 1, justifyContent: "center" }}>✏️ Edit</button>
                    {!isSelf && (
                      isDeactivated
                        ? <button onClick={() => onToggleStatus(user, true)}  className="ut-activate-btn" style={{ flex: 1 }}>▶ Activate</button>
                        : <button onClick={() => onToggleStatus(user, false)} className="ut-suspend-btn"  style={{ flex: 1 }}>⏸ Suspend</button>
                    )}
                    <button onClick={() => onDelete(user._id)} className="ut-del-btn" style={{ flex: 1 }}>🗑 Delete</button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

      </div>{/* end ut-wrap */}

      {/* ── Pagination controls ── */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, padding: "14px 0", flexWrap: "wrap",
        }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={pgBtn(currentPage === 1)}>«</button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={pgBtn(currentPage === 1)}>‹ Prev</button>

          {/* Page number pills */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === "…" ? (
                <span key={`ellipsis-${idx}`} style={{ color: "#94a3b8", fontSize: 13 }}>…</span>
              ) : (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={pgBtn(false, p === currentPage)}>
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={pgBtn(currentPage === totalPages)}>Next ›</button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={pgBtn(currentPage === totalPages)}>»</button>
        </div>
      )}
    </>
  );
}
