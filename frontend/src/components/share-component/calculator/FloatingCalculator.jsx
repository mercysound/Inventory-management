// src/components/share-component/calculator/FloatingCalculator.jsx
//
// Goods/price calculator — floats bottom-left on all pages.
// Features:
//   - Standard arithmetic + percentage (useful for discount calculations)
//   - "×Qty" shortcut: multiply current display value by a quantity
//   - "Margin" shortcut: calculate selling price from cost + margin %
//   - History of last 10 calculations
//   - Per-user ON/OFF preference (localStorage key: melech_calc_enabled)
//   - Default: ON
//
// Position: bottom-left (cart/scroll buttons are bottom-right — no overlap)

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, X, RotateCcw, Clock, ChevronDown } from "lucide-react";

const LS_KEY = "melech_calc_enabled";

export const isCalculatorEnabled = () => {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === null ? true : v === "true"; // default ON
  } catch { return true; }
};

export const setCalculatorEnabled = (val) => {
  try { localStorage.setItem(LS_KEY, String(val)); } catch {}
  // Notify other components (Settings page toggle)
  window.dispatchEvent(new CustomEvent("calcEnabledChanged", { detail: { enabled: val } }));
};

// ── Safe math evaluator (no eval) ────────────────────────────────────────────
// Handles: numbers, +, -, *, /, parentheses, decimals, negatives
const safeMath = (expr) => {
  // Strip all characters that are not digits, operators, dots, spaces, or parens
  const clean = expr.replace(/[^0-9+\-*/.()\s]/g, "").trim();
  if (!clean) throw new Error("empty");

  // Recursive descent parser
  let pos = 0;
  const peek = () => clean[pos] || "";
  const consume = () => clean[pos++];

  const skipWS = () => { while (clean[pos] === " ") pos++; };

  const parseNum = () => {
    skipWS();
    let s = "";
    if (peek() === "-") { s += consume(); }
    while (/[0-9.]/.test(peek())) s += consume();
    if (!s || s === "-") throw new Error("bad number");
    return parseFloat(s);
  };

  const parseExpr = () => parseAddSub();

  const parseAddSub = () => {
    let left = parseMulDiv();
    skipWS();
    while (peek() === "+" || peek() === "-") {
      const op = consume(); skipWS();
      const right = parseMulDiv();
      left = op === "+" ? left + right : left - right;
      skipWS();
    }
    return left;
  };

  const parseMulDiv = () => {
    let left = parseUnary();
    skipWS();
    while (peek() === "*" || peek() === "/") {
      const op = consume(); skipWS();
      const right = parseUnary();
      if (op === "/" && right === 0) throw new Error("div/0");
      left = op === "*" ? left * right : left / right;
      skipWS();
    }
    return left;
  };

  const parseUnary = () => {
    skipWS();
    if (peek() === "(") {
      consume(); // (
      const val = parseExpr();
      skipWS();
      if (peek() === ")") consume();
      return val;
    }
    return parseNum();
  };

  const result = parseExpr();
  if (!isFinite(result)) throw new Error("overflow");
  return result;
};
const fmt = (v) => {
  if (v === "" || v === "-") return v;
  const n = parseFloat(v);
  if (isNaN(n)) return "Error";
  // Up to 10 significant digits, strip trailing zeros
  return parseFloat(n.toPrecision(10)).toString();
};

const FloatingCalculator = () => {
  const [enabled,  setEnabled]  = useState(isCalculatorEnabled);
  const [open,     setOpen]     = useState(false);
  const [display,  setDisplay]  = useState("0");
  const [expr,     setExpr]     = useState("");      // full expression string shown above display
  const [memory,   setMemory]   = useState(null);    // M+ / MR
  const [history,  setHistory]  = useState([]);      // last 10 results
  const [showHist, setShowHist] = useState(false);
  const [justEvaled, setJustEvaled] = useState(false); // after = pressed, next digit clears display
  const [shake,    setShake]    = useState(false);

  // ── Qty input panel state ─────────────────────────────────────────────────
  const [qtyMode,  setQtyMode]  = useState(false);   // show qty input overlay
  const [qtyVal,   setQtyVal]   = useState("");

  // ── Margin input panel state ──────────────────────────────────────────────
  const [marginMode,   setMarginMode]   = useState(false);
  const [marginVal,    setMarginVal]    = useState("");

  const panelRef = useRef(null);

  // Listen for settings toggle from outside
  useEffect(() => {
    const h = (e) => setEnabled(e.detail.enabled);
    window.addEventListener("calcEnabledChanged", h);
    return () => window.removeEventListener("calcEnabledChanged", h);
  }, []);

  // Keyboard support when open
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (qtyMode || marginMode) return;
      const k = e.key;
      if (k === "Escape") { setOpen(false); return; }
      if (k === "Enter" || k === "=") { handleEqual(); return; }
      if (k === "Backspace") { handleDel(); return; }
      if ("0123456789".includes(k)) { handleDigit(k); return; }
      if (["+", "-", "*", "/"].includes(k)) { handleOp(k); return; }
      if (k === ".") { handleDot(); return; }
      if (k === "%") { handlePercent(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, display, expr, justEvaled, qtyMode, marginMode]);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 400); };

  const pushHistory = useCallback((entry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 10));
  }, []);

  // ── Core input handlers ───────────────────────────────────────────────────
  const handleDigit = useCallback((d) => {
    setShowHist(false);
    if (justEvaled) { setDisplay(d); setExpr(""); setJustEvaled(false); return; }
    setDisplay((prev) => {
      if (prev === "0" || prev === "Error") return d;
      if (prev.replace(/[^0-9]/g, "").length >= 12) { triggerShake(); return prev; }
      return prev + d;
    });
  }, [justEvaled]);

  const handleDot = useCallback(() => {
    if (justEvaled) { setDisplay("0."); setExpr(""); setJustEvaled(false); return; }
    setDisplay((prev) => (prev.includes(".") ? prev : (prev === "Error" ? "0." : prev + ".")));
  }, [justEvaled]);

  const handleOp = useCallback((op) => {
    setJustEvaled(false);
    setShowHist(false);
    const cur = display === "Error" ? "0" : display;
    if (expr) {
      // chain: evaluate current expression first
      try {
        const result = fmt(String(safeMath(expr + cur))); // eslint-disable-line no-eval
        setDisplay(result);
        setExpr(result + " " + op + " ");
      } catch {
        setExpr(cur + " " + op + " ");
      }
    } else {
      setExpr(cur + " " + op + " ");
      setDisplay("0");
    }
  }, [display, expr]);

  const handleEqual = useCallback(() => {
    if (!expr) return;
    const cur = display === "Error" ? "0" : display;
    const fullExpr = expr + cur;
    try {
      // eslint-disable-next-line no-eval
      const raw    = safeMath(fullExpr);
      const result = fmt(String(raw));
      pushHistory(`${fullExpr} = ${result}`);
      setDisplay(result);
      setExpr(fullExpr + " =");
      setJustEvaled(true);
    } catch {
      setDisplay("Error");
      setExpr("");
      setJustEvaled(true);
    }
  }, [display, expr, pushHistory]);

  const handlePercent = useCallback(() => {
    try {
      const n = parseFloat(display);
      if (isNaN(n)) return;
      // If there's an expression like "5000 + ", calculate n% of the left operand
      if (expr) {
        const parts  = expr.trim().split(" ");
        const base   = parseFloat(parts[0]);
        if (!isNaN(base)) { setDisplay(fmt(String((base * n) / 100))); return; }
      }
      setDisplay(fmt(String(n / 100)));
    } catch { triggerShake(); }
  }, [display, expr]);

  const handleDel = useCallback(() => {
    if (justEvaled) { handleClear(); return; }
    setDisplay((prev) => {
      if (prev === "Error" || prev.length <= 1) return "0";
      return prev.slice(0, -1) || "0";
    });
  }, [justEvaled]);

  const handleClear = useCallback(() => {
    setDisplay("0"); setExpr(""); setJustEvaled(false); setQtyMode(false); setMarginMode(false);
  }, []);

  const handleAllClear = useCallback(() => {
    setDisplay("0"); setExpr(""); setJustEvaled(false);
    setQtyMode(false); setMarginMode(false); setShowHist(false);
  }, []);

  const handlePlusMinus = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "0" || prev === "Error") return prev;
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  }, []);

  // ── × Qty shortcut ────────────────────────────────────────────────────────
  const applyQty = () => {
    const qty = parseFloat(qtyVal);
    const price = parseFloat(display);
    if (isNaN(qty) || isNaN(price)) { triggerShake(); return; }
    const result = fmt(String(price * qty));
    pushHistory(`₦${fmt(display)} × ${qty} = ₦${result}`);
    setDisplay(result);
    setExpr(`${display} × ${qty} =`);
    setJustEvaled(true);
    setQtyMode(false); setQtyVal("");
  };

  // ── Margin shortcut ───────────────────────────────────────────────────────
  // Selling price = cost / (1 - margin%)
  const applyMargin = () => {
    const cost   = parseFloat(display);
    const margin = parseFloat(marginVal);
    if (isNaN(cost) || isNaN(margin) || margin >= 100) { triggerShake(); return; }
    const sell   = fmt(String(cost / (1 - margin / 100)));
    pushHistory(`Cost ₦${fmt(display)} + ${margin}% margin = Sell ₦${sell}`);
    setDisplay(sell);
    setExpr(`Sell price (${margin}% margin) =`);
    setJustEvaled(true);
    setMarginMode(false); setMarginVal("");
  };

  if (!enabled) return null;

  const POSITION = {
    bottom: "max(24px, calc(env(safe-area-inset-bottom, 0px) + 24px))",
    left:   "max(16px, calc(env(safe-area-inset-left,   0px) + 16px))",
    WebkitTapHighlightColor: "transparent",
  };

  // ── Button helper ─────────────────────────────────────────────────────────
  const Btn = ({ label, onClick, cls = "", wide = false, small = false }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-xl font-semibold active:scale-90 transition-all select-none
        ${wide ? "col-span-2" : ""} ${small ? "text-xs" : "text-base"}
        ${cls}`}
      style={{ minHeight: wide ? 44 : 44, touchAction: "manipulation" }}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* ── Float trigger button ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="calc-float"
            initial={{ opacity: 0, scale: 0.7, y: 16 }}
            animate={{ opacity: 1, scale: 1,   y: 0  }}
            exit={{    opacity: 0, scale: 0.7, y: 16  }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            onClick={() => setOpen(true)}
            aria-label="Open calculator"
            className="fixed z-40 flex flex-col items-center justify-center gap-0.5
              w-14 h-14 rounded-full
              bg-emerald-600/40 backdrop-blur-md
              border border-emerald-400/40
              hover:bg-emerald-600/60 active:scale-95
              shadow-lg shadow-emerald-900/30
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            style={POSITION}
          >
            <Calculator size={18} className="text-white" />
            <span className="text-white text-[9px] font-bold tracking-wide leading-none">Calc</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Calculator panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            key="calc-panel"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.85, y: 20  }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={`fixed z-50 flex flex-col rounded-3xl overflow-hidden shadow-2xl
              bg-gray-900 border border-gray-700/60 select-none
              ${shake ? "animate-[shake_.3s_ease]" : ""}`}
            style={{
              ...POSITION,
              width:    "min(300px, calc(100vw - 32px))",
              maxHeight: "calc(100dvh - 80px)",
            }}
            aria-label="Calculator"
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-gray-300 tracking-wide uppercase">Calculator</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowHist((p) => !p)}
                  title="History"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-300 hover:bg-gray-700/60 transition">
                  <Clock size={13} />
                </button>
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── History panel ──────────────────────────────────────────── */}
            <AnimatePresence>
              {showHist && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="mx-3 mb-2 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    {history.length === 0 ? (
                      <p className="text-[11px] text-gray-500 text-center py-3">No history yet</p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto">
                        {history.map((h, i) => (
                          <div key={i}
                            onClick={() => {
                              const result = h.split(" = ").pop();
                              if (result) { setDisplay(result.replace("₦", "")); setJustEvaled(true); setShowHist(false); }
                            }}
                            className="px-3 py-1.5 text-[11px] text-gray-300 font-mono border-b border-gray-700/60 last:border-0
                              hover:bg-gray-700/50 cursor-pointer truncate"
                            title={h}
                          >{h}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Display ────────────────────────────────────────────────── */}
            <div className="px-4 pb-2 pt-1 flex flex-col items-end">
              {/* Expression line */}
              <p className="text-[11px] text-gray-500 font-mono h-4 truncate w-full text-right">
                {expr || " "}
              </p>
              {/* Main display */}
              <p className={`font-mono font-bold text-white text-right w-full leading-tight
                ${display.length > 12 ? "text-lg" : display.length > 9 ? "text-2xl" : "text-3xl"}`}>
                {display}
              </p>
              {/* Memory indicator */}
              {memory !== null && (
                <p className="text-[10px] text-emerald-400 mt-0.5">M: {fmt(String(memory))}</p>
              )}
            </div>

            {/* ── Qty overlay ────────────────────────────────────────────── */}
            <AnimatePresence>
              {qtyMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                  className="overflow-hidden mx-3 mb-2"
                >
                  <div className="bg-gray-800 rounded-xl border border-emerald-700/60 p-2.5 flex items-center gap-2">
                    <span className="text-xs text-gray-400 shrink-0">Qty:</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      autoFocus
                      value={qtyVal}
                      onChange={(e) => setQtyVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyQty(); if (e.key === "Escape") setQtyMode(false); }}
                      placeholder="e.g. 5"
                      className="flex-1 bg-transparent text-white text-sm font-mono outline-none placeholder:text-gray-600"
                    />
                    <button onClick={applyQty}
                      className="text-xs font-bold text-emerald-400 bg-emerald-900/40 border border-emerald-700/60 rounded-lg px-2.5 py-1 hover:bg-emerald-700/40 transition">
                      ✓
                    </button>
                    <button onClick={() => { setQtyMode(false); setQtyVal(""); }}
                      className="text-gray-500 hover:text-white transition">
                      <X size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Margin overlay ─────────────────────────────────────────── */}
            <AnimatePresence>
              {marginMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                  className="overflow-hidden mx-3 mb-2"
                >
                  <div className="bg-gray-800 rounded-xl border border-amber-700/60 p-2.5 flex items-center gap-2">
                    <span className="text-xs text-gray-400 shrink-0">Margin%:</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      autoFocus
                      value={marginVal}
                      onChange={(e) => setMarginVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyMargin(); if (e.key === "Escape") setMarginMode(false); }}
                      placeholder="e.g. 30"
                      className="flex-1 bg-transparent text-white text-sm font-mono outline-none placeholder:text-gray-600"
                    />
                    <button onClick={applyMargin}
                      className="text-xs font-bold text-amber-400 bg-amber-900/40 border border-amber-700/60 rounded-lg px-2.5 py-1 hover:bg-amber-700/40 transition">
                      ✓
                    </button>
                    <button onClick={() => { setMarginMode(false); setMarginVal(""); }}
                      className="text-gray-500 hover:text-white transition">
                      <X size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Shortcut row ───────────────────────────────────────────── */}
            <div className="px-3 pb-1.5 flex gap-1.5">
              <button
                onClick={() => { setMarginMode(false); setQtyMode((p) => !p); setQtyVal(""); }}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition border
                  ${qtyMode ? "bg-emerald-700 border-emerald-600 text-white" : "bg-gray-800 border-gray-700 text-emerald-400 hover:bg-gray-700"}`}
              >
                ×Qty
              </button>
              <button
                onClick={() => { setQtyMode(false); setMarginMode((p) => !p); setMarginVal(""); }}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition border
                  ${marginMode ? "bg-amber-700 border-amber-600 text-white" : "bg-gray-800 border-gray-700 text-amber-400 hover:bg-gray-700"}`}
              >
                Margin
              </button>
              <button
                onClick={() => { memory !== null ? setMemory(null) : setMemory(parseFloat(display) || 0); }}
                className="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition border bg-gray-800 border-gray-700 text-blue-400 hover:bg-gray-700"
              >
                {memory !== null ? "MC" : "M+"}
              </button>
              {memory !== null && (
                <button
                  onClick={() => { setDisplay(fmt(String(memory))); setJustEvaled(true); }}
                  className="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition border bg-gray-800 border-gray-700 text-blue-300 hover:bg-gray-700"
                >
                  MR
                </button>
              )}
            </div>

            {/* ── Button grid ────────────────────────────────────────────── */}
            <div className="px-3 pb-4 grid grid-cols-4 gap-1.5">

              {/* Row 1 */}
              <Btn label="AC" onClick={handleAllClear}
                cls="bg-gray-600 hover:bg-gray-500 text-white text-sm col-span-1" />
              <Btn label="+/−" onClick={handlePlusMinus}
                cls="bg-gray-600 hover:bg-gray-500 text-white text-sm" />
              <Btn label="%" onClick={handlePercent}
                cls="bg-gray-600 hover:bg-gray-500 text-white text-sm" />
              <Btn label="÷" onClick={() => handleOp("/")}
                cls="bg-amber-500 hover:bg-amber-400 text-white text-lg font-bold" />

              {/* Row 2 */}
              {["7","8","9"].map(d => (
                <Btn key={d} label={d} onClick={() => handleDigit(d)}
                  cls="bg-gray-700 hover:bg-gray-600 text-white" />
              ))}
              <Btn label="×" onClick={() => handleOp("*")}
                cls="bg-amber-500 hover:bg-amber-400 text-white text-lg font-bold" />

              {/* Row 3 */}
              {["4","5","6"].map(d => (
                <Btn key={d} label={d} onClick={() => handleDigit(d)}
                  cls="bg-gray-700 hover:bg-gray-600 text-white" />
              ))}
              <Btn label="−" onClick={() => handleOp("-")}
                cls="bg-amber-500 hover:bg-amber-400 text-white text-lg font-bold" />

              {/* Row 4 */}
              {["1","2","3"].map(d => (
                <Btn key={d} label={d} onClick={() => handleDigit(d)}
                  cls="bg-gray-700 hover:bg-gray-600 text-white" />
              ))}
              <Btn label="+" onClick={() => handleOp("+")}
                cls="bg-amber-500 hover:bg-amber-400 text-white text-lg font-bold" />

              {/* Row 5 */}
              <Btn label="0" onClick={() => handleDigit("0")}
                cls="bg-gray-700 hover:bg-gray-600 text-white col-span-2" wide />
              <Btn label="." onClick={handleDot}
                cls="bg-gray-700 hover:bg-gray-600 text-white" />
              <Btn label="=" onClick={handleEqual}
                cls="bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold" />

            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingCalculator;
