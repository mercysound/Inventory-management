import mongoose from "mongoose";
import dotenv from "dotenv";
import CompletedOrderHistoryModel from "./models/CompletedOrderHistoryModel.js";
import AllOrdersPlacedModel from "./models/AllOrdersPlacedModel.js";

dotenv.config({ path: "./.env" });

const uri = process.env.MONGO_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/melech";

async function main() {
  console.log("connecting to", uri);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const oneCompleted = await CompletedOrderHistoryModel.findOne().lean();
  const onePlaced = await AllOrdersPlacedModel.findOne().lean();
  console.log("completed sample", oneCompleted ? {
    _id: oneCompleted._id.toString(),
    buyerName: oneCompleted.buyerName,
    totalPrice: oneCompleted.totalPrice,
    productCount: oneCompleted.productList?.length,
    firstProducts: oneCompleted.productList?.slice(0, 3),
  } : null);
  console.log("placed sample", onePlaced ? {
    _id: onePlaced._id.toString(),
    buyerName: onePlaced.buyerName,
    totalPrice: onePlaced.totalPrice,
    productCount: onePlaced.productList?.length,
    firstProducts: onePlaced.productList?.slice(0, 3),
  } : null);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
