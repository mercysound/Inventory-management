import React, { useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";

const EMPTY = { name: "", email: "", password: "", phone: "", address: "", role: "" };

export default function AddUserPanel({ onSuccess }) {
  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())                      e.name     = "Name is required";
    if (!form.email.trim())                     e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = "Invalid email";
    if (!form.password || form.password.length < 6) e.password = "Min 6 characters";
    if (!form.role)                             e.role     = "Select a role";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const res = await axiosInstance.post("/users/add", form);
      if (res.data.success) {
        toast.success("User added successfully!");
        setForm(EMPTY); setErrors({});
        onSuccess?.();
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) toast.error(data.errors[0].message);
      else toast.error(data?.message || "Failed to add user");
    } finally { setSaving(false); }
  };

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: undefined })); };

  const tips = [
    { icon: "🔐", title: "Roles matter",       body: "Admin access is sensitive. Only grant it to trusted team members." },
    { icon: "📧", title: "Email is unique",     body: "Each user needs a unique email. Duplicates will be rejected." },
    { icon: "🔒", title: "Secure passwords",   body: "Use at least 8 characters with a mix of letters and numbers." },
    { icon: "📱", title: "Phone & address",    body: "Optional but recommended for customer accounts and deliveries." },
    { icon: "🏪", title: "Wholesale accounts", body: "Wholesale users see wholesale prices when they log into the product catalogue." },
  ];

  const roleDesc = {
    admin:     "⚡ Full access — can manage users, products, orders and settings.",
    staff:     "🔧 Operational access — can manage inventory and view orders.",
    customer:  "🛍 Standard access — can browse products and place orders at retail price.",
    wholesale: "🏪 Wholesale access — sees wholesale prices and can place bulk orders.",
  };

  return (
    <>
      <style>{`
        .aup-layout{display:flex;flex-direction:column;gap:16px;}
        .aup-card{background:#fff;border-radius:14px;border:1px solid #f1f5f9;padding:20px 16px 18px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
        .aup-header{display:flex;gap:12px;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f8fafc;}
        .aup-icon{width:42px;height:42px;border-radius:11px;background:#f0fdf4;border:1px solid #bbf7d0;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
        .aup-title{font-size:16px;font-weight:800;color:#0f172a;margin:0 0 2px;letter-spacing:-0.02em;}
        .aup-sub{font-size:11px;color:#94a3b8;margin:0;}
        .aup-grid{display:flex;flex-direction:column;gap:0;}
        .aup-field{margin-bottom:14px;}
        .aup-label{display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px;letter-spacing:0.03em;text-transform:uppercase;}
        .aup-input{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#f8fafc;transition:border .15s;box-sizing:border-box;}
        .aup-input:focus{border-color:#6366f1;background:#fff;}
        .aup-input-err{border-color:#fca5a5!important;background:#fff8f8!important;}
        .aup-error{display:block;font-size:11px;color:#ef4444;margin-top:3px;}
        .aup-pw-wrap{position:relative;}
        .aup-pw-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;padding:2px;}
        .aup-role-info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:10px 12px;font-size:12px;color:#475569;margin-bottom:14px;overflow:hidden;line-height:1.5;}
        .aup-submit{width:100%;background:#0f172a;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.01em;transition:opacity .15s;margin-top:2px;}
        .aup-tips{background:#fff;border-radius:14px;border:1px solid #f1f5f9;padding:18px 16px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
        .aup-tips-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 14px;}
        .aup-tip{display:flex;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f8fafc;}
        .aup-tip:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none;}
        .aup-tip-title{font-size:12px;font-weight:700;color:#0f172a;margin:0 0 2px;}
        .aup-tip-body{font-size:11px;color:#64748b;margin:0;line-height:1.5;}
        .aup-wholesale-badge{display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;}
        @media(min-width:520px){
          .aup-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;}
          .aup-grid .aup-field:nth-child(odd):last-child{grid-column:1/-1;}
        }
        @media(min-width:900px){
          .aup-layout{flex-direction:row;align-items:start;}
          .aup-card{flex:1;padding:28px 24px 22px;}
          .aup-tips{width:280px;flex-shrink:0;padding:22px 20px;}
          .aup-title{font-size:18px;}
        }
      `}</style>

      <div className="aup-layout">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="aup-card">
          <div className="aup-header">
            <div className="aup-icon">👤</div>
            <div>
              <h2 className="aup-title">New User</h2>
              <p className="aup-sub">Fill in the details to add to your team</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="aup-grid">
              <div className="aup-field">
                <label className="aup-label">Full name <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="John Doe"
                  className={`aup-input${errors.name ? " aup-input-err" : ""}`} />
                {errors.name && <span className="aup-error">{errors.name}</span>}
              </div>
              <div className="aup-field">
                <label className="aup-label">Email address <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="john@example.com"
                  className={`aup-input${errors.email ? " aup-input-err" : ""}`} />
                {errors.email && <span className="aup-error">{errors.email}</span>}
              </div>
            </div>

            <div className="aup-field">
              <label className="aup-label">Password <span style={{ color: "#ef4444" }}>*</span></label>
              <div className="aup-pw-wrap">
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
                  placeholder="Min. 6 characters" style={{ paddingRight: 42 }}
                  className={`aup-input${errors.password ? " aup-input-err" : ""}`} />
                <button type="button" onClick={() => setShowPw(p => !p)} className="aup-pw-eye">
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
              {errors.password && <span className="aup-error">{errors.password}</span>}
            </div>

            <div className="aup-grid">
              <div className="aup-field">
                <label className="aup-label">Phone number</label>
                <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+234 800 000 0000" className="aup-input" />
              </div>
              <div className="aup-field">
                <label className="aup-label">Role <span style={{ color: "#ef4444" }}>*</span></label>
                <select value={form.role} onChange={e => set("role", e.target.value)}
                  className={`aup-input${errors.role ? " aup-input-err" : ""}`}>
                  <option value="">Select role…</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="customer">Customer</option>
                  <option value="wholesale">🏪 Wholesale</option>
                </select>
                {errors.role && <span className="aup-error">{errors.role}</span>}
              </div>
            </div>

            <div className="aup-field">
              <label className="aup-label">Address</label>
              <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street, city, state" className="aup-input" />
            </div>

            {form.role && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="aup-role-info">
                {roleDesc[form.role]}
                {form.role === "wholesale" && (
                  <span className="aup-wholesale-badge" style={{ marginLeft: 8 }}>🏪 Wholesale pricing</span>
                )}
              </motion.div>
            )}

            <button type="submit" disabled={saving} className="aup-submit" style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? "Adding user…" : "Add User →"}
            </button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="aup-tips">
          <h3 className="aup-tips-title">Quick guide</h3>
          {tips.map((t, i) => (
            <div key={i} className="aup-tip">
              <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
              <div>
                <p className="aup-tip-title">{t.title}</p>
                <p className="aup-tip-body">{t.body}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </>
  );
}
