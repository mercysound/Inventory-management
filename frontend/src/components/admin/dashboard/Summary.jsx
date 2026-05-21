import axiosInstance from "../../../utils/axiosInstance";
import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────
// Tiny sparkline component (no chart library)
// ─────────────────────────────────────────────
const Sparkline = ({ data = [], color = "#6366f1", height = 36, width = 80 }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <polyline
        points={`0,${height} ${pts} ${width},${height}`}
        fill={color}
        opacity="0.08"
      />
    </svg>
  );
};

// ─────────────────────────────────────────────
// Animated number counter
// ─────────────────────────────────────────────
const Counter = ({ to, prefix = "", suffix = "", duration = 1200 }) => {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const animate = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * to));
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
};

// ─────────────────────────────────────────────
// Stock bar
// ─────────────────────────────────────────────
const StockBar = ({ stock, max = 5 }) => {
  const pct = Math.min((stock / max) * 100, 100);
  const color = stock === 0 ? "#ef4444" : stock <= 2 ? "#f97316" : "#eab308";
  return (
    <div style={{ height: 4, background: "#f1f5f9", borderRadius: 9 }} aria-hidden="true">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ height: "100%", borderRadius: 9, background: color }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────
// Pill badge
// ─────────────────────────────────────────────
const Pill = ({ children, variant = "neutral" }) => {
  const map = {
    danger:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    warning: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    success: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
    info:    { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    neutral: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  };
  const s = map[variant];
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em",
      padding: "2px 8px", borderRadius: 20,
      textTransform: "uppercase",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      maxWidth: "100%",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
    }}>
      {children}
    </span>
  );
};

// ─────────────────────────────────────────────
// Section card wrapper
// ─────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f1f5f9",
    boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03)",
    padding: "20px 24px",
    ...style,
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────
const KpiCard = ({ title, value, prefix = "", suffix = "", icon, accent, sparkData, delta, deltaLabel, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08, duration: 0.45, ease: "easeOut" }}
    whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(0,0,0,.09)" }}
    style={{
      background: "#fff",
      border: "1px solid #f1f5f9",
      borderRadius: 18,
      padding: "20px 22px",
      boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      display: "flex", flexDirection: "column", gap: 12,
      cursor: "default", position: "relative", overflow: "hidden",
    }}
  >
    {/* accent strip */}
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "18px 18px 0 0" }} aria-hidden="true" />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
          {title}
        </p>
        <p style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
          <Counter to={typeof value === "number" ? value : 0} prefix={prefix} suffix={suffix} />
        </p>
      </div>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: accent + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent, fontSize: 18,
      }}>
        {icon}
      </div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        {delta !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: delta >= 0 ? "#16a34a" : "#dc2626" }}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
        {deltaLabel && (
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 5 }}>{deltaLabel}</span>
        )}
      </div>
      {sparkData && <Sparkline data={sparkData} color={accent} />}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────
// Stock health ring (SVG donut)
// ─────────────────────────────────────────────
const DonutRing = ({ healthy, low, out }) => {
  const total = healthy + low + out || 1;
  const r = 44, cx = 52, cy = 52, stroke = 10;
  const circ = 2 * Math.PI * r;
  const healthyPct = (healthy / total) * circ;
  const lowPct = (low / total) * circ;
  const outPct = (out / total) * circ;
  return (
    <svg width={104} height={104} viewBox="0 0 104 104" aria-label={`Stock health: ${healthy} healthy, ${low} low, ${out} out of stock`}>
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {/* healthy */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth={stroke}
        strokeDasharray={`${healthyPct} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round" />
      {/* low */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={stroke}
        strokeDasharray={`${lowPct} ${circ}`}
        strokeDashoffset={circ * 0.25 - healthyPct}
        strokeLinecap="round" />
      {/* out */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={stroke}
        strokeDasharray={`${outPct} ${circ}`}
        strokeDashoffset={circ * 0.25 - healthyPct - lowPct}
        strokeLinecap="round" />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#0f172a" fontFamily="'DM Mono', monospace">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="system-ui" textTransform="uppercase">
        TOTAL
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────
// Main Summary Component
// ─────────────────────────────────────────────
const Summary = () => {
  const [data, setData] = useState({
    totalProducts: 0, totalStock: 0, ordersToday: 0, revenue: 0,
    outOfStock: [], highestSaleProduct: null, lowStock: [],
    // new fields from enhanced backend:
    revenueChange: null, stockHealthScore: null,
    topCategories: [], recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeStockTab, setActiveStockTab] = useState("low"); // "low" | "out"
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);


const fetchData = async (attempt = 1) => {
  try {
    if (attempt === 1) setLoading(true);
    const res = await axiosInstance.get("/dashboard");
    setData(res.data.dashboardData);
    setLoading(false);
  } catch (err) {
    const isTimeout = err.code === "ECONNABORTED" || err.message?.includes("timeout");
    if (isTimeout && attempt === 1) {
      console.warn("Dashboard timeout — retrying in 3s...");
      setTimeout(() => fetchData(2), 3000);
      return;
    }
    toast.error("Failed to load dashboard. Please refresh.");
    setLoading(false);
  }
};

  useEffect(() => { fetchData(); }, []);

  const {
    totalProducts, totalStock, ordersToday, revenue,
    outOfStock, highestSaleProduct, lowStock,
    revenueChange, stockHealthScore, topCategories = [], recentActivity = [],
  } = data;

  const healthyCount = totalProducts - outOfStock.length - lowStock.length;
  const healthScore = stockHealthScore ?? (totalProducts > 0
    ? Math.round((healthyCount / totalProducts) * 100) : 0);

  // Skeleton
  if (loading) return (
    <div style={styles.page}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ ...styles.skeleton, height: 120, borderRadius: 18 }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ ...styles.skeleton, height: 220, borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>
            Overview
            <span style={styles.liveDot} aria-label="live data" />
          </h1>
          <p style={styles.subtitle}>
            {now.toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric" })}
            {" · "}
            {now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={fetchData}
          style={styles.refreshBtn}
          aria-label="Refresh dashboard"
        >
          ↻ Refresh
        </motion.button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={styles.kpiGrid}>
        <KpiCard
          index={0} title="Total Products" value={totalProducts} icon="📦"
          accent="#6366f1"
          sparkData={[8,12,10,14,13,15,totalProducts % 20 || 14]}
          delta={5} deltaLabel="vs last month"
        />
        <KpiCard
          index={1} title="Units in Stock" value={totalStock} icon="🗃️"
          accent="#0ea5e9"
          sparkData={[300,450,400,600,520,totalStock % 600 || 430]}
          delta={-3} deltaLabel="vs last week"
        />
        <KpiCard
          index={2} title="Orders Today" value={ordersToday} icon="🛒"
          accent="#f59e0b"
          sparkData={[4,7,5,9,6,11,ordersToday % 12 || 8]}
          delta={revenueChange ?? 12} deltaLabel="vs yesterday"
        />
        <KpiCard
          index={3} title="Revenue" value={revenue} prefix="₦" icon="💰"
          accent="#10b981"
          sparkData={[5000,12000,9000,18000,14000,revenue % 20000 || 16000]}
          delta={revenueChange ?? 8} deltaLabel="vs yesterday"
        />
      </div>

      {/* ── Middle Row ── */}
      <div style={styles.midGrid}>

        {/* Stock Health */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
        >
          <Card style={{ height: "100%" }}>
            <p style={styles.cardLabel}>Stock health</p>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
              <DonutRing
                healthy={Math.max(healthyCount, 0)}
                low={lowStock.length}
                out={outOfStock.length}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {[
                  { label: "Healthy", count: Math.max(healthyCount, 0), color: "#22c55e", variant: "success" },
                  { label: "Low stock", count: lowStock.length, color: "#f59e0b", variant: "warning" },
                  { label: "Out of stock", count: outOfStock.length, color: "#ef4444", variant: "danger" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, display: "inline-block" }} aria-hidden="true" />
                      <span style={{ fontSize: 13, color: "#64748b" }}>{row.label}</span>
                    </div>
                    <Pill variant={row.variant}>{row.count}</Pill>
                  </div>
                ))}
                <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Health score</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: healthScore > 70 ? "#16a34a" : healthScore > 40 ? "#b45309" : "#dc2626" }}>
                      {healthScore}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#f1f5f9", borderRadius: 9, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${healthScore}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                      style={{
                        height: "100%", borderRadius: 9,
                        background: healthScore > 70 ? "#22c55e" : healthScore > 40 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Top Seller */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.45 }}
        >
          <Card style={{ height: "100%" }}>
            <p style={styles.cardLabel}>Top selling product</p>
            {highestSaleProduct?.name ? (
              <div style={{ marginTop: 16 }}>
                <div style={styles.trophyRow}>
                  <div style={styles.trophyBadge}>🏆</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", margin: 0, overflowWrap: "break-word" }}>
                      {highestSaleProduct.name}
                    </p>
                    <div style={{ marginTop: 8, minWidth: 0 }}>
                      <Pill variant="info">{highestSaleProduct.category || "—"}</Pill>
                    </div>
                  </div>
                </div>
                <div style={styles.saleStats}>
                  <div style={styles.statBox}>
                    <p style={styles.statVal}>{(highestSaleProduct.totalQuantity ?? 0).toLocaleString()}</p>
                    <p style={styles.statKey}>Units sold</p>
                  </div>
                  <div style={{ width: 1, background: "#f1f5f9" }} aria-hidden="true" />
                  <div style={styles.statBox}>
                    <p style={styles.statVal}>#{1}</p>
                    <p style={styles.statKey}>Rank</p>
                  </div>
                  <div style={{ width: 1, background: "#f1f5f9" }} aria-hidden="true" />
                  <div style={styles.statBox}>
                    <p style={{ ...styles.statVal, color: "#16a34a" }}>Active</p>
                    <p style={styles.statKey}>Status</p>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Sales velocity</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>High</span>
                  </div>
                  <div style={{ height: 6, background: "#f1f5f9", borderRadius: 9, overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: "78%" }}
                      transition={{ duration: 1, delay: 0.6 }}
                      style={{ height: "100%", borderRadius: 9, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <span style={{ fontSize: 32 }}>📉</span>
                <p>{highestSaleProduct?.message || "No sales data yet"}</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Quick Activity */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.49, duration: 0.45 }}
        >
          <Card style={{ height: "100%" }}>
            <p style={styles.cardLabel}>Movement summary</p>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Sell-through rate", value: totalStock > 0 ? `${Math.min(Math.round((ordersToday / (totalStock / 30)) * 100), 100)}%` : "—", icon: "📊", good: true },
                { label: "Stock at risk", value: `${outOfStock.length + lowStock.length} SKUs`, icon: "⚠️", good: outOfStock.length + lowStock.length === 0 },
                { label: "Avg. daily orders", value: ordersToday > 0 ? ordersToday : "—", icon: "📦", good: true },
                { label: "Revenue / order", value: ordersToday > 0 ? `₦${Math.round(revenue / ordersToday).toLocaleString()}` : "—", icon: "💵", good: true },
                { label: "Product catalogue", value: `${totalProducts} SKUs`, icon: "🗂️", good: true },
              ].map((row, i) => (
                <div key={i} style={styles.activityRow}>
                  <span style={{ fontSize: 15 }}>{row.icon}</span>
                  <span style={{ fontSize: 13, color: "#475569", flex: 1 }}>{row.label}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: row.good ? "#0f172a" : "#dc2626",
                    fontFamily: "'DM Mono', monospace",
                  }}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ── Bottom Row: Stock Alerts ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.45 }}
      >
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={styles.cardLabel}>Stock alerts</p>
            <div style={styles.tabGroup} role="tablist">
              {[
                { key: "low", label: `Low stock (${lowStock.length})` },
                { key: "out", label: `Out of stock (${outOfStock.length})` },
              ].map(t => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={activeStockTab === t.key}
                  onClick={() => setActiveStockTab(t.key)}
                  style={{
                    ...styles.tab,
                    background: activeStockTab === t.key ? "#0f172a" : "transparent",
                    color: activeStockTab === t.key ? "#fff" : "#64748b",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStockTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeStockTab === "low" && (
                lowStock.length === 0
                  ? <div style={styles.emptyState}><span style={{ fontSize: 28 }}>✅</span><p>No low-stock products</p></div>
                  : <div style={styles.productGrid}>
                    {lowStock.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        style={styles.productCard}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <p style={styles.productName}>{p.name}</p>
                            <p style={styles.productCat}>{p.categoryId?.name || "Uncategorised"}</p>
                          </div>
                          <Pill variant={p.stock <= 2 ? "danger" : "warning"}>{p.stock} left</Pill>
                        </div>
                        <StockBar stock={p.stock} />
                        <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 5, textAlign: "right" }}>
                          {p.stock <= 1 ? "🔴 Reorder now" : "🟡 Reorder soon"}
                        </p>
                      </motion.div>
                    ))}
                  </div>
              )}

              {activeStockTab === "out" && (
                outOfStock.length === 0
                  ? <div style={styles.emptyState}><span style={{ fontSize: 28 }}>🎉</span><p>All products are in stock!</p></div>
                  : <div style={styles.productGrid}>
                    {outOfStock.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ ...styles.productCard, borderColor: "#fecaca", background: "#fff8f8" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <p style={styles.productName}>{p.name}</p>
                            <p style={styles.productCat}>{p.categoryId?.name || "Uncategorised"}</p>
                          </div>
                          <Pill variant="danger">Out of stock</Pill>
                        </div>
                        <p style={{ fontSize: 11, color: "#dc2626", marginTop: 10, fontWeight: 600 }}>
                          ⛔ Restock immediately — lost sales risk
                        </p>
                      </motion.div>
                    ))}
                  </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = {
  page: {
    padding: "28px 28px 40px",
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'DM Sans', 'Outfit', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    maxWidth: 1200,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  h1: {
    fontSize: 26,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.03em",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  liveDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 3px rgba(34,197,94,.25)",
    animation: "pulse 2s infinite",
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    margin: "4px 0 0",
    fontWeight: 400,
  },
  refreshBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.01em",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
  },
  midGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    margin: 0,
  },
  trophyRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    minWidth: 0,
  },
  trophyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    flexShrink: 0,
  },
  saleStats: {
    display: "flex",
    gap: 0,
    background: "#f8fafc",
    borderRadius: 12,
    border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  statBox: {
    flex: 1,
    padding: "10px 0",
    textAlign: "center",
  },
  statVal: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
    fontFamily: "'DM Mono', monospace",
    margin: 0,
  },
  statKey: {
    fontSize: 10,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "2px 0 0",
  },
  activityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    background: "#f8fafc",
    borderRadius: 9,
    border: "1px solid #f1f5f9",
  },
  tabGroup: {
    display: "flex",
    gap: 4,
    background: "#f1f5f9",
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    border: "none",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all .15s",
    letterSpacing: "0.01em",
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
  },
  productCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 16px",
    background: "#fff",
  },
  productName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 3px",
    lineHeight: 1.3,
  },
  productCat: {
    fontSize: 11,
    color: "#94a3b8",
    margin: 0,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "32px 16px",
    color: "#94a3b8",
    fontSize: 14,
  },
  skeleton: {
    background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
};

export default Summary;