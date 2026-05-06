import React from "react";
import { motion } from "framer-motion";

const Avatar = ({ name, size = 34 }) => {
  const initials = name?.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase() || "?";
  const hue = [...(name||"")].reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:`hsl(${hue},55%,88%)`,color:`hsl(${hue},55%,35%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,flexShrink:0,fontFamily:"'DM Mono',monospace"}}>
      {initials}
    </div>
  );
};

const SortIcon = ({active,dir}) => (
  <span style={{opacity:active?1:0.35,fontSize:10,marginLeft:3}}>{active?(dir==="asc"?"↑":"↓"):"↕"}</span>
);

const SkeletonRows = () => (
  <>
    {[...Array(5)].map((_,i)=>(
      <tr key={i}>
        {[...Array(6)].map((_,j)=>(
          <td key={j} style={{padding:"12px 14px"}}>
            <div style={{height:13,background:"#f1f5f9",borderRadius:6,width:j===1?"75%":j===0?"30px":"55%",animation:"ut-shimmer 1.4s infinite"}}/>
          </td>
        ))}
      </tr>
    ))}
  </>
);

export default function UsersTable({users,loading,searchQuery,setSearchQuery,roleFilter,setRoleFilter,sortConfig,onSort,onDelete,onEdit,roleColors}) {
  const cols = [
    {key:"name",  label:"Name"},
    {key:"email", label:"Email"},
    {key:"phone", label:"Phone"},
    {key:"role",  label:"Role"},
  ];

  return (
    <>
      <style>{`
        @keyframes ut-shimmer{0%,100%{opacity:1}50%{opacity:.4}}
        .ut-wrap{background:#fff;border-radius:14px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.04);overflow:hidden;}
        /* ── Toolbar ── */
        .ut-toolbar{padding:12px 14px;border-bottom:1px solid #f1f5f9;display:flex;flex-direction:column;gap:10px;}
        .ut-search-wrap{position:relative;display:flex;align-items:center;width:100%;}
        .ut-search-icon{position:absolute;left:11px;font-size:14px;pointer-events:none;}
        .ut-search{width:100%;padding:9px 34px 9px 34px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit;outline:none;background:#f8fafc;}
        .ut-clear{position:absolute;right:9px;background:none;border:none;cursor:pointer;font-size:12px;color:#94a3b8;padding:2px 4px;}
        .ut-filters{display:flex;gap:6px;flex-wrap:wrap;}
        .ut-filter{border-radius:20px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;transition:all .15s;white-space:nowrap;}
        .ut-count-badge{font-size:10px;font-weight:700;border-radius:10px;padding:1px 5px;font-family:'DM Mono',monospace;}
        .ut-result-count{font-size:11px;color:#94a3b8;padding:6px 14px 0;margin:0;}
        /* ── Desktop table ── */
        .ut-table-wrap{overflow-x:auto;display:none;}
        .ut-table{width:100%;border-collapse:collapse;min-width:620px;}
        .ut-thead{background:#f8fafc;}
        .ut-th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;border-bottom:1px solid #f1f5f9;white-space:nowrap;}
        .ut-sort-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;padding:0;display:flex;align-items:center;}
        .ut-tr{background:#fff;border-bottom:1px solid #f8fafc;transition:background .1s;}
        .ut-tr:hover{background:#f8fafc;}
        .ut-td{padding:11px 14px;vertical-align:middle;font-size:13px;}
        .ut-role-pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.03em;text-transform:capitalize;}
        .ut-edit-btn{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:7px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:3px;transition:all .15s;white-space:nowrap;}
        .ut-del-btn{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:7px;padding:4px 9px;font-size:12px;cursor:pointer;transition:all .15s;}
        .ut-empty{text-align:center;padding:48px;color:#94a3b8;font-size:13px;}
        /* ── Mobile cards ── */
        .ut-cards{display:flex;flex-direction:column;gap:10px;padding:12px;}
        .ut-card{border:1px solid #f1f5f9;border-radius:12px;padding:14px;background:#fff;transition:box-shadow .15s;}
        .ut-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.06);}
        .ut-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px;}
        .ut-card-info{min-width:0;}
        .ut-card-name{font-size:14px;font-weight:700;color:#0f172a;margin:0 0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ut-card-email{font-size:12px;color:#64748b;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ut-card-meta{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;}
        .ut-card-row{display:flex;gap:6px;font-size:12px;color:#475569;align-items:flex-start;}
        .ut-card-key{font-weight:700;color:#94a3b8;min-width:54px;flex-shrink:0;}
        .ut-card-actions{display:flex;gap:8px;}
        /* ── Breakpoints ── */
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
        {/* Toolbar */}
        <div className="ut-toolbar">
          <div className="ut-search-wrap">
            <span className="ut-search-icon">🔍</span>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Search name or email…" className="ut-search" aria-label="Search users"/>
            {searchQuery && <button onClick={()=>setSearchQuery("")} className="ut-clear" aria-label="Clear">✕</button>}
          </div>
          <div className="ut-filters" role="group" aria-label="Filter by role">
            {["all","admin","staff","customer"].map(r=>(
              <button key={r} onClick={()=>setRoleFilter(r)} className="ut-filter"
                style={{background:roleFilter===r?"#0f172a":"#fff",color:roleFilter===r?"#fff":"#64748b",border:`1px solid ${roleFilter===r?"#0f172a":"#e2e8f0"}`}}>
                {r==="all"?"All":r.charAt(0).toUpperCase()+r.slice(1)}
                {r!=="all"&&(
                  <span className="ut-count-badge"
                    style={{background:roleFilter===r?"rgba(255,255,255,.18)":(roleColors[r]?.bg||"#f1f5f9"),color:roleFilter===r?"#fff":(roleColors[r]?.text||"#64748b")}}>
                    {users.filter(u=>u.role===r).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <p className="ut-result-count">
          {loading?"Loading…":`${users.length} user${users.length!==1?"s":""}`}
          {(searchQuery||roleFilter!=="all")&&!loading&&" (filtered)"}
        </p>

        {/* Desktop table */}
        <div className="ut-table-wrap">
          <table className="ut-table" aria-label="Users table">
            <thead>
              <tr className="ut-thead">
                <th className="ut-th" style={{width:40}}>#</th>
                {cols.map(c=>(
                  <th key={c.key} className="ut-th">
                    <button onClick={()=>onSort(c.key)} className="ut-sort-btn" aria-label={`Sort by ${c.label}`}>
                      {c.label}<SortIcon active={sortConfig.key===c.key} dir={sortConfig.dir}/>
                    </button>
                  </th>
                ))}
                <th className="ut-th">Address</th>
                <th className="ut-th" style={{textAlign:"center"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows/> : users.length===0 ? (
                <tr><td colSpan={7} className="ut-empty"><div style={{fontSize:28,marginBottom:8}}>👤</div>No users found</td></tr>
              ) : users.map((user,i)=>(
                <motion.tr key={user._id} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{delay:i*0.025}} className="ut-tr">
                  <td className="ut-td" style={{color:"#94a3b8",fontSize:11}}>{i+1}</td>
                  <td className="ut-td">
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <Avatar name={user.name}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:13,color:"#0f172a"}}>{user.name}</div>
                        <div style={{fontSize:10,color:"#94a3b8"}}>{user.profileCompleted?"✓ Complete":"Incomplete"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="ut-td"><a href={`mailto:${user.email}`} style={{color:"#2563eb",textDecoration:"none",fontSize:12}}>{user.email}</a></td>
                  <td className="ut-td" style={{fontSize:12}}>{user.phone||<span style={{color:"#cbd5e1"}}>—</span>}</td>
                  <td className="ut-td">
                    <span className="ut-role-pill" style={{background:roleColors[user.role]?.bg||"#f1f5f9",color:roleColors[user.role]?.text||"#64748b",border:`1px solid ${roleColors[user.role]?.border||"#e2e8f0"}`}}>
                      {user.role}
                    </span>
                  </td>
                  <td className="ut-td" style={{fontSize:12,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {user.address||<span style={{color:"#cbd5e1"}}>—</span>}
                  </td>
                  <td className="ut-td">
                    <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                      <button onClick={()=>onEdit(user)} className="ut-edit-btn">✏️ Edit</button>
                      <button onClick={()=>onDelete(user._id)} className="ut-del-btn">🗑</button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="ut-cards">
          {loading ? (
            [...Array(3)].map((_,i)=>(
              <div key={i} className="ut-card" style={{background:"#f8fafc"}}>
                {[...Array(3)].map((_,j)=>(
                  <div key={j} style={{height:13,background:"#e2e8f0",borderRadius:6,marginBottom:8,width:j===0?"60%":"40%",animation:"ut-shimmer 1.4s infinite"}}/>
                ))}
              </div>
            ))
          ) : users.length===0 ? (
            <div className="ut-empty">No users found</div>
          ) : users.map((user,i)=>(
            <motion.div key={user._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} className="ut-card">
              <div className="ut-card-top">
                <div style={{display:"flex",gap:10,alignItems:"center",minWidth:0,flex:1}}>
                  <Avatar name={user.name} size={38}/>
                  <div className="ut-card-info">
                    <p className="ut-card-name">{user.name}</p>
                    <p className="ut-card-email">{user.email}</p>
                  </div>
                </div>
                <span className="ut-role-pill" style={{background:roleColors[user.role]?.bg||"#f1f5f9",color:roleColors[user.role]?.text||"#64748b",border:`1px solid ${roleColors[user.role]?.border||"#e2e8f0"}`,flexShrink:0}}>
                  {user.role}
                </span>
              </div>
              {(user.phone||user.address)&&(
                <div className="ut-card-meta">
                  {user.phone&&<div className="ut-card-row"><span className="ut-card-key">Phone</span>{user.phone}</div>}
                  {user.address&&<div className="ut-card-row"><span className="ut-card-key">Address</span><span style={{wordBreak:"break-word"}}>{user.address}</span></div>}
                </div>
              )}
              <div className="ut-card-actions">
                <button onClick={()=>onEdit(user)} className="ut-edit-btn" style={{flex:1,justifyContent:"center"}}>✏️ Edit</button>
                <button onClick={()=>onDelete(user._id)} className="ut-del-btn" style={{flex:1}}>🗑 Delete</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}