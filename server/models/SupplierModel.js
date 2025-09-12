import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name : {type: String, require: true},
  email: {type: String, required:true},
  number: {type: String, required:true},
  address: {type: String, required:true},
  date: {type: Date, default:Date.now},
});

const SupplierModel = mongoose.model("Supplier", supplierSchema);


export default SupplierModel; 