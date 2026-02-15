// seedAdmin.js
import bcrypt from "bcrypt";
import User from "./models/UserModel.js";
import connectDb from "./db/connection.js";

const seedAdmin = async () => {
  try {
    await connectDb();

    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const adminUser = new User({
      name: "Admin",
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      address: "Head Office",
    });

    await adminUser.save();

    console.log("✅ Admin created successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();
