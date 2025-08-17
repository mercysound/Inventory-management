import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
   name: {type: String},
   email: {type: String, require: true, unique:true},
   password:{type: String, require:true},
   address:{type: String},
   role: {type: String, enum:["admin", "customer"], default:"customer"}
})

const User = mongoose.model("User", userSchema);

export default User;