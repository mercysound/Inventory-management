// server/models/SuperAdminModel.js
// The platform-level super admin (you). Stored in the MAIN database,
// separate from any tenant's user collection.
import mongoose from "mongoose";

const superAdminSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    // 2-factor: simple totp or email OTP (optional future)
    isSuperAdmin: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

const SuperAdminModel = mongoose.model("SuperAdmin", superAdminSchema);
export default SuperAdminModel;
