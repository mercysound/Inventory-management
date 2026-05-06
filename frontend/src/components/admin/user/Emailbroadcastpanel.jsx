import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";

const MAX_MB = 5;

const TEMPLATES = [
  { label:"Restock Alert", icon:"📦", subject:"Important: Product Restock Update",
    body:`<p>Dear Customer,</p><p>We're excited to let you know that several of your favourite items are <strong>back in stock</strong>. Head over to the store and grab yours before they sell out!</p><p>Best regards,<br><strong>The Team</strong></p>` },
  { label:"Promo Blast", icon:"🎉", subject:"🔥 Exclusive Offer Just for You!",
    body:`<p>Hi there,</p><p>We have a <strong>special promotion</strong> running this week. Use code <strong>SAVE20</strong> at checkout for 20% off.</p><p>Warm regards,<br><strong>The Team</strong></p>` },
  { label:"Staff Notice", icon:"📋", subject:"Team Notice — Action Required",
    body:`<p>Hi team,</p><p>This is an internal update from management. Please review and take the required actions.</p><p>[Insert your message here]</p><p>Thanks,<br><strong>Admin</strong></p>` },
  { label:"Welcome", icon:"👋", subject:"Welcome to Our Platform!",
    body:`<p>Hello,</p><p>We're thrilled to have you on board. Your account is set up and ready to go.</p><p>Cheers,<br><strong>The Team</strong></p>` },
];

const ROLES = [
  { value:"all",      label:"All",       icon:"👥" },
  { value:"admin",    label:"Admins",    icon:"⚡" },
  { value:"staff",    label:"Staff",     icon:"🔧" },
  { value:"customer", label:"Customers", icon:"🛍" },
  { value:"single",   label:"One user",  icon:"✉️" },
];

export default function EmailBroadcastPanel({ users, roleColors }) {
  const [targetRole,    setTargetRole]    = useState("all");
  const [singleEmail,   setSingleEmail]   = useState("");
  const [subject,       setSubject]       = useState("");
  const [body,          setBody]          = useState("");
  const [attachments,   setAttachments]   = useState([]);
  const [sending,       setSending]       = useState(false);
  const [preview,       setPreview]       = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileRef = useRef(null);

  const recipientCount = targetRole === "single"
    ? (singleEmail.trim() ? 1 : 0)
    : targetRole === "all" ? users.length
    : users.filter(u => u.role === targetRole).length;

  const recipients = (targetRole === "single"
    ? (singleEmail ? [{ name: singleEmail, email: singleEmail, role: "—" }] : [])
    : users.filter(u => targetRole === "all" || u.role === targetRole)
  ).slice(0, 20);

  const handleFiles = async (e) => {
    for (const file of Array.from(e.target.files)) {
      if (file.size > MAX_MB * 1024 * 1024) { toast.error(`${file.name} exceeds ${MAX_MB}MB`); continue; }
      const base64 = await new Promise(res => { const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.readAsDataURL(file); });
      setAttachments(p => [...p, { name:file.name, size:file.size, type:file.type, base64 }]);
    }
    e.target.value = "";
  };

  // ── Job result state ──────────────────────────────────────────────────────
  const [jobResult, setJobResult] = useState(null);
  // null | { status:'running'|'done', total, sent, failed, failedList, jobId }

  const pollJob = (jobId, total) => {
    setJobResult({ status: "running", total, sent: 0, failed: 0, failedList: [], jobId });
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/users/email-broadcast/${jobId}`);
        const job = res.data.job;
        setJobResult({ ...job, jobId });
        if (job.status === "done") {
          clearInterval(interval);
          // Single, clear toast based on outcome
          if (job.failed === 0) {
            toast.success(`✅ All ${job.sent} emails delivered successfully!`);
          } else if (job.sent === 0) {
            toast.error(`❌ Broadcast failed — 0 of ${job.total} emails delivered. See report below.`);
          } else {
            toast.warn(`⚠️ Partial delivery: ${job.sent} sent, ${job.failed} failed. See report below.`);
          }
        }
      } catch {
        // Polling error — silently retry; don't spam toasts
      }
    }, 3000);
    // Safety stop after 10 min
    setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
  };

  const handleSend = async () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!body.trim())    { toast.error("Email body is required"); return; }
    if (targetRole === "single" && !singleEmail.trim()) { toast.error("Enter recipient email"); return; }
    if (recipientCount === 0) { toast.error("No recipients selected"); return; }

    setSending(true);
    setJobResult(null);
    try {
      const res = await axiosInstance.post("/users/email-broadcast", {
        targetRole: targetRole === "single" ? null : targetRole,
        singleEmail: targetRole === "single" ? singleEmail : null,
        subject, body, attachments,
      });
      // Server responds with 202 immediately — start polling
      const { jobId, total } = res.data.data;
      setSubject(""); setBody(""); setAttachments([]); setSingleEmail("");
      pollJob(jobId, total);
    } catch (err) {
      // Only reaches here for validation / setup errors (4xx) — not timeouts
      const msg = err.response?.data?.message;
      toast.error(msg || "Could not start broadcast. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const fmtBytes = b => b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <>
      <style>{`
        .ebp-wrap{display:flex;flex-direction:column;gap:14px;}
        /* ── Compose card ── */
        .ebp-card{background:#fff;border-radius:14px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.04);overflow:hidden;}
        .ebp-card-header{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 14px;border-bottom:1px solid #f8fafc;gap:10px;flex-wrap:wrap;}
        .ebp-header-left{display:flex;gap:10px;align-items:center;}
        .ebp-header-icon{width:40px;height:40px;border-radius:11px;background:#fff7ed;border:1px solid #fed7aa;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
        .ebp-compose-title{font-size:15px;font-weight:800;color:#0f172a;margin:0 0 1px;letter-spacing:-0.02em;}
        .ebp-compose-sub{font-size:11px;color:#94a3b8;margin:0;}
        .ebp-tpl-toggle{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;color:#475569;white-space:nowrap;}
        /* templates */
        .ebp-tpl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:12px 16px;background:#fafbfc;border-bottom:1px solid #f1f5f9;}
        .ebp-tpl-btn{display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-family:inherit;transition:all .15s;font-size:12px;font-weight:600;color:#0f172a;}
        .ebp-tpl-btn:hover{background:#f8fafc;border-color:#cbd5e1;}
        /* section */
        .ebp-section{padding:14px 16px 0;}
        .ebp-section-label{display:block;font-size:10px;font-weight:700;color:#475569;letter-spacing:0.05em;margin-bottom:8px;text-transform:uppercase;}
        /* role grid */
        .ebp-role-grid{display:flex;gap:6px;flex-wrap:wrap;}
        .ebp-role-btn{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;}
        .ebp-count-badge{font-size:10px;font-weight:700;border-radius:8px;padding:1px 5px;font-family:'DM Mono',monospace;}
        /* inputs */
        .ebp-input{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;background:#f8fafc;outline:none;box-sizing:border-box;transition:border .15s;}
        .ebp-input:focus{border-color:#6366f1;background:#fff;}
        .ebp-char-count{display:block;text-align:right;font-size:10px;color:#94a3b8;margin-top:3px;}
        .ebp-preview-toggle{background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;color:#2563eb;font-family:inherit;padding:0;}
        .ebp-preview-box{border:1px solid #e2e8f0;border-radius:9px;padding:14px 16px;background:#fefefe;min-height:160px;font-size:13px;line-height:1.7;color:#374151;}
        .ebp-textarea{width:100%;padding:11px 12px;border:1px solid #e2e8f0;border-radius:9px;font-size:12px;font-family:'DM Mono','Fira Code',monospace;background:#f8fafc;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6;}
        .ebp-textarea:focus{border-color:#6366f1;background:#fff;}
        /* drop zone */
        .ebp-drop{border:2px dashed #e2e8f0;border-radius:11px;padding:20px 16px;text-align:center;cursor:pointer;background:#fafbfc;transition:border-color .15s;}
        .ebp-drop:hover{border-color:#94a3b8;}
        .ebp-attach-list{display:flex;flex-direction:column;gap:6px;margin-top:8px;}
        .ebp-attach-item{display:flex;align-items:center;gap:9px;padding:7px 11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;}
        .ebp-attach-name{font-size:12px;font-weight:600;color:#0f172a;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ebp-attach-size{font-size:10px;color:#94a3b8;margin:0;}
        .ebp-attach-rm{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:13px;flex-shrink:0;padding:2px;}
        /* send bar */
        .ebp-send-bar{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;margin-top:14px;border-top:1px solid #f1f5f9;background:#fafbfc;flex-wrap:wrap;gap:10px;}
        .ebp-rcpt-pill{display:flex;align-items:center;gap:5px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:5px 12px;font-size:12px;}
        .ebp-send-btn{background:#0f172a;color:#fff;border:none;border-radius:10px;padding:10px 24px;font-size:13px;font-weight:700;font-family:inherit;transition:opacity .15s;white-space:nowrap;cursor:pointer;}
        /* recipients sidebar */
        .ebp-rcpt-card{background:#fff;border-radius:14px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.04);overflow:hidden;}
        .ebp-rcpt-header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 12px;border-bottom:1px solid #f8fafc;}
        .ebp-rcpt-title{font-size:13px;font-weight:700;color:#0f172a;margin:0;}
        .ebp-rcpt-count{background:#0f172a;color:#fff;border-radius:20px;padding:2px 9px;font-size:11px;font-family:'DM Mono',monospace;}
        .ebp-rcpt-list{max-height:300px;overflow-y:auto;padding:6px 0;}
        .ebp-rcpt-row{display:flex;align-items:center;gap:9px;padding:7px 14px;}
        .ebp-rcpt-av{width:28px;height:28px;border-radius:50%;background:#eff6ff;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}
        .ebp-rcpt-name{font-size:12px;font-weight:600;color:#0f172a;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ebp-rcpt-email{font-size:10px;color:#94a3b8;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ebp-rcpt-pill-role{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;text-transform:capitalize;white-space:nowrap;flex-shrink:0;}
        .ebp-empty{text-align:center;padding:28px 12px;color:#94a3b8;font-size:13px;}
        @keyframes ebp-spin{to{transform:rotate(360deg);}}
        /* ── Result panel ── */
        .ebp-result{border-radius:12px;border:1.5px solid;padding:16px 18px;margin:14px 16px 0;}
        .ebp-result.running{background:#eff6ff;border-color:#bfdbfe;}
        .ebp-result.done-ok{background:#f0fdf4;border-color:#bbf7d0;}
        .ebp-result.done-partial{background:#fffbeb;border-color:#fde68a;}
        .ebp-result.done-fail{background:#fef2f2;border-color:#fecaca;}
        .ebp-result-title{font-size:13px;font-weight:700;margin:0 0 8px;display:flex;align-items:center;gap:7px;}
        .ebp-progress-track{height:6px;background:rgba(0,0,0,.08);border-radius:3px;overflow:hidden;margin-bottom:10px;}
        .ebp-progress-fill{height:100%;border-radius:3px;transition:width .5s ease;}
        .ebp-result-stats{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;}
        .ebp-stat-item{display:flex;flex-direction:column;}
        .ebp-stat-val{font-size:20px;font-weight:800;font-family:'DM Mono',monospace;line-height:1;}
        .ebp-stat-key{font-size:10px;color:inherit;opacity:.7;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;}
        .ebp-failed-list{margin-top:10px;border-top:1px solid rgba(0,0,0,.07);padding-top:10px;}
        .ebp-failed-title{font-size:11px;font-weight:700;margin:0 0 6px;opacity:.8;}
        .ebp-failed-row{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:11px;}
        .ebp-failed-row:last-child{border-bottom:none;}
        .ebp-failed-email{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;max-width:180px;}
        .ebp-failed-reason{opacity:.75;line-height:1.4;}
        .ebp-result-dismiss{background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;padding:6px 0 0;opacity:.7;display:block;}
        .ebp-result-dismiss:hover{opacity:1;}
        @media(min-width:640px){
          .ebp-result{margin:14px 20px 0;}
          .ebp-failed-email{max-width:240px;}
        }
        @media(min-width:640px){
          .ebp-card-header{padding:20px 20px 16px;}
          .ebp-section{padding:16px 20px 0;}
          .ebp-tpl-grid{grid-template-columns:repeat(4,1fr);padding:12px 20px;}
          .ebp-send-bar{padding:14px 20px;}
          .ebp-rcpt-list{max-height:420px;}
          .ebp-compose-title{font-size:17px;}
        }
        @media(min-width:960px){
          .ebp-wrap{flex-direction:row;align-items:start;}
          .ebp-card{flex:1;}
          .ebp-rcpt-card{width:260px;flex-shrink:0;position:sticky;top:16px;}
        }
      `}</style>

      <div className="ebp-wrap">
        {/* ── Compose panel ── */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.3}} className="ebp-card">
          <div className="ebp-card-header">
            <div className="ebp-header-left">
              <div className="ebp-header-icon">✉️</div>
              <div>
                <h2 className="ebp-compose-title">Broadcast Email</h2>
                <p className="ebp-compose-sub">Compose and send to your user base</p>
              </div>
            </div>
            <button onClick={()=>setShowTemplates(p=>!p)} className="ebp-tpl-toggle">
              📋 Templates
            </button>
          </div>

          <AnimatePresence>
            {showTemplates&&(
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2}} style={{overflow:"hidden"}}>
                <div className="ebp-tpl-grid">
                  {TEMPLATES.map((t,i)=>(
                    <button key={i} className="ebp-tpl-btn" onClick={()=>{setSubject(t.subject);setBody(t.body);setShowTemplates(false);toast.success(`"${t.label}" applied`)}}>
                      <span style={{fontSize:18}}>{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Target role */}
          <div className="ebp-section">
            <label className="ebp-section-label">Send to</label>
            <div className="ebp-role-grid">
              {ROLES.map(r=>(
                <button key={r.value} onClick={()=>setTargetRole(r.value)} className="ebp-role-btn"
                  style={{background:targetRole===r.value?"#0f172a":"#f8fafc",color:targetRole===r.value?"#fff":"#475569",border:`1.5px solid ${targetRole===r.value?"#0f172a":"#e2e8f0"}`}}>
                  <span>{r.icon}</span><span>{r.label}</span>
                  {r.value!=="single"&&(
                    <span className="ebp-count-badge"
                      style={{background:targetRole===r.value?"rgba(255,255,255,.15)":"#e2e8f0",color:targetRole===r.value?"#fff":"#64748b"}}>
                      {r.value==="all"?users.length:users.filter(u=>u.role===r.value).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {targetRole==="single"&&(
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} style={{overflow:"hidden",marginTop:10}}>
                  <input type="email" value={singleEmail} onChange={e=>setSingleEmail(e.target.value)}
                    placeholder="recipient@example.com" className="ebp-input" list="ebp-emails"/>
                  <datalist id="ebp-emails">{users.map(u=><option key={u._id} value={u.email} label={u.name}/>)}</datalist>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Subject */}
          <div className="ebp-section" style={{paddingTop:14}}>
            <label className="ebp-section-label">Subject line</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Important update from our team"
              className="ebp-input" maxLength={200}/>
            <span className="ebp-char-count">{subject.length}/200</span>
          </div>

          {/* Body */}
          <div className="ebp-section" style={{paddingTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <label className="ebp-section-label" style={{marginBottom:0}}>
                Message <span style={{color:"#94a3b8",fontWeight:400,textTransform:"none",letterSpacing:0}}>(HTML ok)</span>
              </label>
              <button onClick={()=>setPreview(p=>!p)} className="ebp-preview-toggle">
                {preview?"✏️ Edit":"👁 Preview"}
              </button>
            </div>
            {preview
              ? <div className="ebp-preview-box" dangerouslySetInnerHTML={{__html:body||"<p style='color:#94a3b8'>Nothing to preview…</p>"}}/>
              : <textarea value={body} onChange={e=>setBody(e.target.value)} rows={9}
                  placeholder={"<p>Dear Customer,</p>\n<p>Your message here…</p>"} className="ebp-textarea"/>
            }
          </div>

          {/* Attachments */}
          <div className="ebp-section" style={{paddingTop:14,paddingBottom:0}}>
            <label className="ebp-section-label">Attachments <span style={{color:"#94a3b8",fontWeight:400,textTransform:"none",letterSpacing:0}}>(max {MAX_MB}MB each)</span></label>
            <div className="ebp-drop" onClick={()=>fileRef.current?.click()}
              onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFiles({target:{files:e.dataTransfer.files},value:""})}}
              role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&fileRef.current?.click()}>
              <span style={{fontSize:24}}>📎</span>
              <p style={{fontSize:12,color:"#475569",margin:"5px 0 2px",fontWeight:600}}>Click or drag files here</p>
              <p style={{fontSize:11,color:"#94a3b8",margin:0}}>PDF, DOCX, images — up to {MAX_MB}MB each</p>
              <input ref={fileRef} type="file" multiple onChange={handleFiles} style={{display:"none"}}/>
            </div>
            {attachments.length>0&&(
              <div className="ebp-attach-list">
                {attachments.map((a,i)=>(
                  <div key={i} className="ebp-attach-item">
                    <span>{a.type.startsWith("image")?"🖼":a.type==="application/pdf"?"📄":"📎"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p className="ebp-attach-name">{a.name}</p>
                      <p className="ebp-attach-size">{fmtBytes(a.size)}</p>
                    </div>
                    <button onClick={()=>setAttachments(p=>p.filter((_,j)=>j!==i))} className="ebp-attach-rm">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Broadcast Result Panel ── */}
          {jobResult && (() => {
            const isDone    = jobResult.status === "done";
            const allOk     = isDone && jobResult.failed === 0;
            const allFailed = isDone && jobResult.sent   === 0;
            const partial   = isDone && !allOk && !allFailed;
            const running   = !isDone;
            const progress  = jobResult.total > 0
              ? Math.round(((jobResult.sent + jobResult.failed) / jobResult.total) * 100)
              : 0;
            const panelCls  = running ? "running" : allOk ? "done-ok" : partial ? "done-partial" : "done-fail";
            const titleColor= running ? "#1d4ed8" : allOk ? "#15803d" : partial ? "#b45309" : "#dc2626";
            const barColor  = running ? "#3b82f6" : allOk ? "#22c55e" : partial ? "#f59e0b"  : "#ef4444";

            return (
              <div className={`ebp-result ${panelCls}`} role="status" aria-live="polite">
                <p className="ebp-result-title" style={{ color: titleColor }}>
                  {running && <span style={{ display:"inline-block", animation:"ebp-spin .9s linear infinite" }}>⏳</span>}
                  {allOk   && "✅"}
                  {partial && "⚠️"}
                  {allFailed && "❌"}
                  {running   ? `Sending… ${jobResult.sent + jobResult.failed} / ${jobResult.total}` :
                   allOk     ? `All ${jobResult.sent} emails delivered successfully` :
                   partial   ? `Partial delivery — ${jobResult.sent} sent, ${jobResult.failed} failed` :
                               `Delivery failed — 0 of ${jobResult.total} emails sent`}
                </p>

                {/* Progress bar */}
                <div className="ebp-progress-track">
                  <div className="ebp-progress-fill"
                    style={{ width: `${running ? Math.max(progress, 4) : 100}%`, background: barColor }} />
                </div>

                {/* Stats */}
                <div className="ebp-result-stats" style={{ color: titleColor }}>
                  <div className="ebp-stat-item">
                    <span className="ebp-stat-val">{jobResult.total}</span>
                    <span className="ebp-stat-key">Total</span>
                  </div>
                  <div className="ebp-stat-item">
                    <span className="ebp-stat-val" style={{ color: "#16a34a" }}>{jobResult.sent}</span>
                    <span className="ebp-stat-key">Delivered</span>
                  </div>
                  {jobResult.failed > 0 && (
                    <div className="ebp-stat-item">
                      <span className="ebp-stat-val" style={{ color: "#dc2626" }}>{jobResult.failed}</span>
                      <span className="ebp-stat-key">Failed</span>
                    </div>
                  )}
                </div>

                {/* Failed list — only shown when done and there are failures */}
                {isDone && jobResult.failedList?.length > 0 && (
                  <div className="ebp-failed-list">
                    <p className="ebp-failed-title" style={{ color: titleColor }}>
                      Failed recipients ({jobResult.failedList.length})
                    </p>
                    {jobResult.failedList.slice(0, 20).map((f, i) => (
                      <div key={i} className="ebp-failed-row" style={{ color: titleColor }}>
                        <span className="ebp-failed-email" title={f.email}>📧 {f.email}</span>
                        <span className="ebp-failed-reason">— {f.reason}</span>
                      </div>
                    ))}
                    {jobResult.failedList.length > 20 && (
                      <p style={{ fontSize: 11, opacity: .7, margin: "6px 0 0" }}>
                        +{jobResult.failedList.length - 20} more (check server logs for full list)
                      </p>
                    )}
                    {allFailed && (
                      <p style={{ fontSize: 11, marginTop: 8, opacity: .75, lineHeight: 1.5 }}>
                        💡 <strong>Tip:</strong> Invalid addresses cannot receive mail. Ask affected users to update their email in their profile.
                      </p>
                    )}
                    {partial && (
                      <p style={{ fontSize: 11, marginTop: 8, opacity: .75, lineHeight: 1.5 }}>
                        💡 <strong>Note:</strong> Emails that failed were due to invalid addresses or temporary server issues — not a problem with your message content.
                      </p>
                    )}
                  </div>
                )}

                {isDone && (
                  <button className="ebp-result-dismiss" style={{ color: titleColor }}
                    onClick={() => setJobResult(null)}>
                    Dismiss report ✕
                  </button>
                )}
              </div>
            );
          })()}

          {/* Send bar */}
          <div className="ebp-send-bar">
            <div className="ebp-rcpt-pill">
              <span>📬</span>
              <span style={{fontWeight:600,color:"#0f172a"}}>{recipientCount} recipient{recipientCount!==1?"s":""}</span>
              {targetRole!=="single"&&<span style={{color:"#94a3b8"}}>· {targetRole==="all"?"all roles":targetRole+"s"}</span>}
            </div>
            <button onClick={handleSend} disabled={sending||recipientCount===0} className="ebp-send-btn"
              style={{opacity:(sending||recipientCount===0||jobResult?.status==="running")?0.55:1,cursor:(sending||recipientCount===0||jobResult?.status==="running")?"not-allowed":"pointer"}}>
              {sending?"Starting broadcast…": jobResult?.status==="running"?"Sending in background…":"Send Email →"}
            </button>
          </div>
        </motion.div>

        {/* ── Recipient preview ── */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.3,delay:0.1}} className="ebp-rcpt-card">
          <div className="ebp-rcpt-header">
            <h3 className="ebp-rcpt-title">Recipients</h3>
            <span className="ebp-rcpt-count">{recipientCount}</span>
          </div>
          <div className="ebp-rcpt-list">
            {recipients.map((u,i)=>(
              <div key={i} className="ebp-rcpt-row">
                <div className="ebp-rcpt-av">{(u.name||u.email).charAt(0).toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p className="ebp-rcpt-name">{u.name||u.email}</p>
                  <p className="ebp-rcpt-email">{u.email}</p>
                </div>
                {u.role&&u.role!=="—"&&(
                  <span className="ebp-rcpt-pill-role"
                    style={{background:roleColors[u.role]?.bg||"#f1f5f9",color:roleColors[u.role]?.text||"#64748b",border:`1px solid ${roleColors[u.role]?.border||"#e2e8f0"}`}}>
                    {u.role}
                  </span>
                )}
              </div>
            ))}
            {recipientCount>20&&<div style={{textAlign:"center",padding:"10px",fontSize:11,color:"#94a3b8"}}>+{recipientCount-20} more</div>}
            {recipientCount===0&&<div className="ebp-empty"><div style={{fontSize:24,marginBottom:6}}>📭</div>No recipients selected</div>}
          </div>
        </motion.div>
      </div>
    </>
  );
}