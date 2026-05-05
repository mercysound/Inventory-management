import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import ProductModel from "../models/ProductModel.js";
import { sendResponse, sendError } from '../utils/apiResponse.js';

const getData = async (req, res) => {
  try {
    // ✅ Total Products
    const totalProducts = await ProductModel.countDocuments({ isDeleted: false });

    // ✅ Total Stock
    const stockResult = await ProductModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, totalStock: { $sum: "$stock" } } },
    ]);
    const totalStock = stockResult[0]?.totalStock || 0;

    // ✅ Today's Orders
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const ordersToday = await AllOrdersPlacedModel.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // ✅ Revenue
    const revenueResult = await AllOrdersPlacedModel.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
    ]);
    const revenue = revenueResult[0]?.totalRevenue || 0;

    // ✅ Out of Stock
    const outOfStock = await ProductModel.find({ stock: 0 })
      .select("name stock")
      .populate("categoryId", "name");

    // ✅ Highest Sale Product (Fixed)
    const highestSaleResult = await AllOrdersPlacedModel.aggregate([
      { $unwind: "$productList" },
      {
        $group: {
          _id: "$productList.productId",
          totalQuantity: { $sum: "$productList.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $lookup: {
          from: "categories",
          localField: "productInfo.categoryId",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: "$productInfo.name",
          totalQuantity: 1,
          category: "$categoryInfo.name",
        },
      },
    ]);
    const highestSaleProduct =
      highestSaleResult[0] || { message: "No sale data available" };

    // ✅ Low Stock Products
    const lowStock = await ProductModel.find({
      isDeleted: false,
      stock: { $gt: 0, $lt: 5 },
    })
      .select("name stock")
      .populate("categoryId", "name");

    // ✅ Final dashboard data
    const dashboardData = {
      totalProducts,
      totalStock,
      ordersToday,
      revenue,
      outOfStock,
      highestSaleProduct,
      lowStock,
    };

    return sendResponse(res, 200, { dashboardData }, "Dashboard data retrieved successfully");
  } catch (error) {
    console.error("Dashboard error:", error);
    return sendError(res, 500, "Error fetching dashboard summary");
  }
};

export { getData };