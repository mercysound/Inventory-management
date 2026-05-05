import mongoose from "mongoose";

const connectDB = async (retries = 3) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
    });
    console.log("✅ MongoDB Connected successfully");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    if (retries > 0) {
      console.log(`🔄 Retrying in 3 seconds... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return connectDB(retries - 1);
    } else {
      console.error("❌ Max retries reached. Exiting...");
      process.exit(1);
    }
  }
};

export default connectDB;