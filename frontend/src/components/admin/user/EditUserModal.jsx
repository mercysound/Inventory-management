import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";

const roleColors = {
  admin:     { bg: "#f3f0ff", text: "#6d28d9", border: "#ddd6fe" },
  staff:     { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  customer:  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  wholesale: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
};

export default function EditUserModal({ user, onClose, onSuccess }) {
  const [form,    setForm]    = useState({ name: "", email: "", phone: "", address: "", role: "", newPassword: "" });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [showPw,  setShowPw]  = useState(false);

  useEffect(() => {
    if (user) setForm({
      name:        user.name    || "",
      email:       user.email   || "",
      phone:       user.phone   || "",
      address:     user.address || "",
      role:        user.role    || "customer",
      newPassword: "",
    });
  }, [user]);

  const handleKey = useCallback((e) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const scroller = document.getElementById("main-scroll");
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      const s = document.getElementById("main-scroll");
      if (s) s.style.overflow = "";
    };
  }, []);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Name required";
    if (!form.email.trim()) e.email = "Email required";
    if (!form.role)         e.role  = "Select a role";
    if (form.newPassword && form.newPassword.length < 6) e.newPassword = "Min 6 characters";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        name:    form.name,
        email:   form.email,
        phone:   form.phone,
        address: form.address,
        role:    form.role,
      };
      // Only include newPassword if the admin actually typed one
      if (form.newPassword && form.newPassword.trim().length >= 6) {
        payload.newPassword = form.newPassword.trim();
      }
      const res = await axiosInstance.put(`/users/${user._id}`, payload);
      if (res.data.success) {
        toast.success(form.newPassword ? "User updated & password reset!" : "User updated");
        onSuccess?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally { setSaving(false); }
  };

  const roleChanged = form.role !== user?.role;

  return (
    <>
      <style>{`
        .eum-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:1200;backdrop-filter:blur(3px);overflow-y:auto;display:flex;align-items:center;justify-content:center;padding:16px 12px;}
        .eum-modal{background:#fff;border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.2);width:100%;max-width:540px;flex-shrink:0;position:relative;margin:auto;}
        .eum-header{display:flex;justify-content:space-between;align-items:center;padding:20px 18px 16px;border-bottom:1px solid #f1f5f9;gap:10px;}
        .eum-avatar-row{display:flex;gap:10px;align-items:center;min-width:0;}
        .eum-avatar{width:40px;height:40px;border-radius:50%;background:#eff6ff;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;flex-shrink:0;}
        .eum-title{font-size:16px;font-weight:800;color:#0f172a;margin:0 0 1px;letter-spacing:-0.02em;}
        .eum-sub{font-size:11px;color:#94a3b8;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;}
        .eum-close{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:13px;color:#64748b;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;}
        .eum-close:hover{background:#f1f5f9;}
        .eum-body{padding:18px 18px 0;}
        .eum-grid{display:flex;flex-direction:column;gap:0;}
        .eum-field{margin-bottom:13px;}
        .eum-label{display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px;letter-spacing:0.03em;text-transform:uppercase;}
        .eum-input{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;background:#f8fafc;outline:none;box-sizing:border-box;transition:border .15s;}
        .eum-input:focus{border-color:#6366f1;background:#fff;}
        .eum-input-err{border-color:#fca5a5!important;background:#fff8f8!important;}
        .eum-error{font-size:11px;color:#ef4444;margin-top:3px;display:block;}
        .eum-warning{background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:10px 12px;font-size:12px;color:#92400e;margin-bottom:12px;line-height:1.5;overflow:hidden;}
        .eum-pw-section{background:#fef2f2;border:1px solid #fecaca;border-radius:11px;padding:14px;margin-bottom:12px;}
        .eum-pw-title{font-size:12px;font-weight:700;color:#dc2626;margin:0 0 10px;display:flex;align-items:center;gap:6px;}
        .eum-pw-hint{font-size:11px;color:#94a3b8;margin-top:4px;display:block;}
        .eum-pw-wrap{position:relative;}
        .eum-pw-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;padding:2px;}
        .eum-footer{display:flex;gap:8px;justify-content:flex-end;padding:14px 18px 18px;border-top:1px solid #f1f5f9;margin-top:14px;}
        .eum-cancel{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0;border-radius:9px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;flex:1;}
        .eum-save{background:#0f172a;color:#fff;border:none;border-radius:9px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s;flex:2;}
        @media(min-width:480px){
          .eum-backdrop{padding:24px 16px;}
          .eum-header{padding:22px 24px 18px;}
          .eum-body{padding:20px 24px 0;}
          .eum-footer{padding:16px 24px 22px;}
          .eum-title{font-size:18px;}
          .eum-sub{max-width:none;}
          .eum-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;}
          .eum-cancel{flex:none;}
          .eum-save{flex:none;}
        }
      `}</style>

      <motion.div className="eum-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog" aria-modal="true">
        <motion.div className="eum-modal"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22 }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="eum-header">
            <div className="eum-avatar-row">
              <div className="eum-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <h2 className="eum-title">Edit User</h2>
                <p className="eum-sub">{user?.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="eum-close" aria-label="Close">✕</button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="eum-body">
              <div className="eum-grid">
                <div className="eum-field">
                  <label className="eum-label">Full name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input value={form.name} onChange={e => set("name", e.target.value)}
                    className={`eum-input${errors.name ? " eum-input-err" : ""}`} />
                  {errors.name && <span className="eum-error">{errors.name}</span>}
                </div>
                <div className="eum-field">
                  <label className="eum-label">Email <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    className={`eum-input${errors.email ? " eum-input-err" : ""}`} />
                  {errors.email && <span className="eum-error">{errors.email}</span>}
                </div>
              </div>

              <div className="eum-grid">
                <div className="eum-field">
                  <label className="eum-label">Phone</label>
                  <input value={form.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="+234 800 000 0000" className="eum-input" />
                </div>
                <div className="eum-field">
                  <label className="eum-label">Role <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.role} onChange={e => set("role", e.target.value)}
                    className={`eum-input${errors.role ? " eum-input-err" : ""}`}>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="customer">Customer</option>
                    <option value="wholesale">🏪 Wholesale</option>
                  </select>
                  {errors.role && <span className="eum-error">{errors.role}</span>}
                </div>
              </div>

              <div className="eum-field">
                <label className="eum-label">Address</label>
                <input value={form.address} onChange={e => set("address", e.target.value)}
                  placeholder="Street, city, state" className="eum-input" />
              </div>

              {roleChanged && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="eum-warning">
                  ⚠️ Role changing from{" "}
                  <strong style={{ color: roleColors[user?.role]?.text }}>{user?.role}</strong>{" "}→{" "}
                  <strong style={{ color: roleColors[form.role]?.text }}>{form.role}</strong>.
                  {" "}This updates their permissions immediately.
                </motion.div>
              )}

              {/* ── Admin password reset section ── */}
              <div className="eum-pw-section">
                <p className="eum-pw-title">
                  🔑 Reset Password <span style={{ fontWeight: 400, fontSize: 11, color: "#b45309" }}>(Admin override — no old password needed)</span>
                </p>
                <div className="eum-pw-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.newPassword}
                    onChange={e => set("newPassword", e.target.value)}
                    placeholder="Leave blank to keep current password"
                    style={{ paddingRight: 38 }}
                    className={`eum-input${errors.newPassword ? " eum-input-err" : ""}`}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="eum-pw-eye">
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                {errors.newPassword
                  ? <span className="eum-error">{errors.newPassword}</span>
                  : <span className="eum-pw-hint">If filled, this user's password will be changed immediately upon saving.</span>
                }
              </div>
            </div>

            <div className="eum-footer">
              <button type="button" onClick={onClose} className="eum-cancel">Cancel</button>
              <button type="submit" disabled={saving} className="eum-save" style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </>
  );
}
