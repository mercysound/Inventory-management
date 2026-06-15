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
}, {
  timestamps: true,
});

const User = mongoose.model("User", userSchema);
export default User;
