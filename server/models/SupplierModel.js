import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  address: { type: String, trim: true, default: "" },
  contactPerson: { type: String, trim: true, default: "" },
  notes: { type: String, trim: true, default: "" },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

const SupplierModel = mongoose.model("Supplier", supplierSchema);
export default SupplierModel;