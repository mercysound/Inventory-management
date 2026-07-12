// FulfillmentModal.jsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Phone, User, Truck, Store, AlertTriangle } from "lucide-react";
import useEscapeToClose from "../../share-component/receipt/useEscapeToClose";

const inputCls =
  "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent " +
  "bg-white transition placeholder:text-gray-400";

const scrollToInput = (e) => {
  setTimeout(() => {
    try { e.target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
  }, 300);
};

const FulfillmentModal = ({ isOpen, onClose, onConfirm, userProfile = null }) => {
  const [type,      setType]      = useState("pickup");
  const [address,   setAddress]   = useState(userProfile?.address || "");
  const [recipient, setRecipient] = useState(userProfile?.name    || "");
  const [phone,     setPhone]     = useState(userProfile?.phone   || "");
  const [errors,    setErrors]    = useState({});

  useEffect(() => {
    if (isOpen) {
      setAddress(userProfile?.address || "");
      setRecipient(userProfile?.name  || "");
      setPhone(userProfile?.phone     || "");
    }
  }, [isOpen, userProfile]);

  const validate = () => {
    if (type === "pickup") return true;
    const errs = {};
    if (!recipient.trim()) errs.recipient = "Recipient name is required";
    if (!phone.trim())     errs.phone     = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(phone.trim()))
      errs.phone = "Enter a valid phone number";
    if (!address.trim())   errs.address   = "Delivery address is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── MUST be declared before useEscapeToClose which references it ──────────
  const handleClose = () => {
    setType("pickup");
    setAddress(userProfile?.address || "");
    setRecipient(userProfile?.name  || "");
    setPhone(userProfile?.phone     || "");
    setErrors({});
    onClose();
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm({
      fulfillmentType:       type,
      deliveryAddress:       type === "delivery" ? address.trim()   : undefined,
      deliveryRecipientName: type === "delivery" ? recipient.trim() : undefined,
      deliveryPhone:         type === "delivery" ? phone.trim()     : undefined,
    });
  };

  // ESC key closes the modal — handleClose must be declared above this line
  useEscapeToClose(isOpen, handleClose);

  // Lock scroll on open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const el = document.getElementById("main-scroll");
    if (el) { el.dataset.prevOverflow = el.style.overflow; el.style.overflow = "hidden"; }
    return () => {
      document.body.style.overflow = "";
      const el2 = document.getElementById("main-scroll");
      if (el2) el2.style.overflow = el2.dataset.prevOverflow || "";
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.55)",
            padding: "16px",
          }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white w-full sm:max-w-lg rounded-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - 32px)" }}
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">How would you like your order?</h2>
                <p className="text-xs text-gray-400 mt-0.5">Choose before proceeding to payment</p>
              </div>
              <button onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                <X size={17} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">

              {/* Option cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "pickup",   icon: Store, label: "Self Pickup",    desc: "I'll collect my order at the store", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-500" },
                  { id: "delivery", icon: Truck, label: "Deliver to Me",  desc: "Send my order to my address",        color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-500"  },
                ].map((opt) => {
                  const active = type === opt.id;
                  const Icon   = opt.icon;
                  return (
                    <button key={opt.id} type="button"
                      onClick={() => { setType(opt.id); setErrors({}); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all
                        ${active ? `${opt.border} ${opt.bg}` : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${active ? opt.bg : "bg-gray-100"}`}>
                        <Icon size={22} className={active ? opt.color : "text-gray-400"} />
                      </div>
                      <p className={`text-sm font-bold ${active ? opt.color : "text-gray-700"}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Delivery fields */}
              <AnimatePresence>
                {type === "delivery" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <User size={11} /> Recipient Name
                      </label>
                      <input type="text" value={recipient} inputMode="text" enterKeyHint="next" autoComplete="name"
                        onChange={(e) => { setRecipient(e.target.value); setErrors((p) => ({ ...p, recipient: "" })); }}
                        onFocus={scrollToInput}
                        placeholder="Full name of the person receiving the order"
                        className={inputCls} />
                      {userProfile?.name && recipient === userProfile.name && (
                        <p className="text-[10px] text-indigo-400 mt-0.5">Pre-filled from your profile — edit if different</p>
                      )}
                      {errors.recipient && <p className="text-xs text-red-500 mt-1">{errors.recipient}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Phone size={11} /> Recipient Phone
                      </label>
                      <input type="tel" value={phone} inputMode="tel" enterKeyHint="next" autoComplete="tel"
                        onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: "" })); }}
                        onFocus={scrollToInput}
                        placeholder="Phone number we can call for delivery"
                        className={inputCls} />
                      {userProfile?.phone && phone === userProfile.phone && (
                        <p className="text-[10px] text-indigo-400 mt-0.5">Pre-filled from your profile — edit if different</p>
                      )}
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <MapPin size={11} /> Delivery Address
                      </label>
                      <textarea value={address} rows={3} inputMode="text" enterKeyHint="done" autoComplete="street-address"
                        onChange={(e) => { setAddress(e.target.value); setErrors((p) => ({ ...p, address: "" })); }}
                        onFocus={scrollToInput}
                        placeholder="Full delivery address including street, area, city..."
                        className={inputCls + " resize-none"} />
                      {userProfile?.address && address === userProfile.address && (
                        <p className="text-[10px] text-indigo-400 mt-0.5">Pre-filled from your profile — edit if different</p>
                      )}
                      {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                    </div>

                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                      <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 leading-relaxed">
                        <p className="font-bold mb-1">Transport fare is NOT included in your payment</p>
                        <p>
                          You are only paying for your products now. A member of our team will contact
                          you on the number above to discuss the transport cost before delivery.
                          Payment can be made before or after delivery — as agreed with our team.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer — always visible ── */}
            <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button type="button" onClick={handleClose}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <motion.button type="button" onClick={handleConfirm} whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition">
                Continue to Payment →
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FulfillmentModal;
