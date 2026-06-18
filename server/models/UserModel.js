import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: String },
  address: { type: String },
  role: {
    type: String,
    enum: ["admin", "staff", "customer", "wholesale"],
    default: "customer",
  },
  picture: { type: String },
  profileCompleted: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  // ── Deactivation ──────────────────────────────────────────────────────────
  // isActive: false = user is blocked from logging in / making API requests.
  // Already-authenticated users finish their current session gracefully —
  // the block only kicks in on the NEXT request after deactivation.
  isActive:         { type: Boolean, default: true },
  deactivatedAt:    { type: Date,    default: null },
  deactivatedReason:{ type: String,  default: null },
}, {
  timestamps: true,
});

const User = mongoose.model("User", userSchema);
export default User;
