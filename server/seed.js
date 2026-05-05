import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "./models/UserModel.js";

dotenv.config();

const connectDB = async (retries = 3) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB Connected");
    return true;
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    if (retries > 0) {
      console.log(`🔄 Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return connectDB(retries - 1);
    }
    throw error;
  }
};

const createAdmin = async () => {
  try {
    await connectDB();

    const existing = await User.findOne({ email: "admin@melechehub.com" });

    if (existing) {
      console.log("⚠️  Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin123!", 10);

    await User.create({
      name: "Super Admin",
      email: "admin@melechehub.com",
      password: hashedPassword,
      role: "admin",
      profileCompleted: true,
    });

    console.log("✅ Admin created successfully with email: admin@melechehub.com");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    process.exit(1);
  }
};

createAdmin();
