// server/scripts/migrateFulfillmentType.js
// One-time migration: sets fulfillmentType = "pickup" on all existing
// AllOrdersPlaced documents that were created before the fulfillment feature.
// Run once: node --env-file=.env server/scripts/migrateFulfillmentType.js

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Update all documents where fulfillmentType is not set
    const result = await AllOrdersPlacedModel.updateMany(
      { fulfillmentType: { $exists: false } },
      { $set: { fulfillmentType: "pickup" } }
    );

    console.log(`Migration complete. Updated ${result.modifiedCount} orders.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
};

run();
