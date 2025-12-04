import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // optional for Google users
  phone: { type: String },     // optional, will complete profile later if missing
  address: { type: String },   // optional, will complete profile later if missing
  role: { type: String, enum: ["admin", "staff", "customer"], default: "customer" },
  picture: { type: String },    // optional, store Google profile picture
  profileCompleted: { type: Boolean, default: false }
}, {
  timestamps: true // createdAt, updatedAt
});


const User = mongoose.model("User", userSchema);
export default User;
