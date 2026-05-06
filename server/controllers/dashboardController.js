import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import ProductModel from "../models/ProductModel.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";

const getData = async (req, res) => {
  try {
    // ─────────────────────────────────────────
    // 1. TOTALS
    // ─────────────────────────────────────────
    const totalProducts = await ProductModel.countDocuments({ isDeleted: false });

    const stockResult = await ProductModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, totalStock: { $sum: "$stock" } } },
    ]);
    const totalStock = stockResult[0]?.totalStock || 0;

    // ─────────────────────────────────────────
    // 2. TODAY'S ORDERS
    // ─────────────────────────────────────────
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const ordersToday = await AllOrdersPlacedModel.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // ─────────────────────────────────────────
    // 3. YESTERDAY'S ORDERS (for % change)
    // ─────────────────────────────────────────
    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(endOfDay);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);

    const ordersYesterday = await AllOrdersPlacedModel.countDocuments({
      createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
    });

    const ordersChange = ordersYesterday > 0
      ? Math.round(((ordersToday - ordersYesterday) / ordersYesterday) * 100)
      : null;

    // ─────────────────────────────────────────
    // 4. REVENUE (all-time + today + yesterday)
    // ─────────────────────────────────────────
    const revenueResult = await AllOrdersPlacedModel.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
    ]);
    const revenue = revenueResult[0]?.totalRevenue || 0;

    const todayRevenueResult = await AllOrdersPlacedModel.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const revenueToday = todayRevenueResult[0]?.total || 0;

    const yesterdayRevenueResult = await AllOrdersPlacedModel.aggregate([
      { $match: { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const revenueYesterday = yesterdayRevenueResult[0]?.total || 0;

    const revenueChange = revenueYesterday > 0
      ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
      : null;

    // ─────────────────────────────────────────
    // 5. STOCK ALERTS
    // ─────────────────────────────────────────
    const outOfStock = await ProductModel.find({ isDeleted: false, stock: 0 })
      .select("name stock")
      .populate("categoryId", "name");

    const lowStock = await ProductModel.find({
      isDeleted: false,
      stock: { $gt: 0, $lt: 5 },
    })
      .select("name stock")
      .populate("categoryId", "name");

    // ─────────────────────────────────────────
    // 6. STOCK HEALTH SCORE (0–100)
    //    = % of active products that are healthy (stock >= 5)
    // ─────────────────────────────────────────
    const stockHealthScore = totalProducts > 0
      ? Math.round(
          ((totalProducts - outOfStock.length - lowStock.length) / totalProducts) * 100
        )
      : 100;

    // ─────────────────────────────────────────
    // 7. HIGHEST-SALE PRODUCT
    // ─────────────────────────────────────────
    const highestSaleResult = await AllOrdersPlacedModel.aggregate([
      { $unwind: "$productList" },
      {
        $group: {
          _id: "$productList.productId",
          totalQuantity: { $sum: "$productList.quantity" },
          totalRevenue:  { $sum: { $multiply: ["$productList.quantity", "$productList.price"] } },
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
          name:          "$productInfo.name",
          totalQuantity: 1,
          totalRevenue:  1,
          category:      "$categoryInfo.name",
        },
      },
    ]);
    const highestSaleProduct = highestSaleResult[0] || { message: "No sale data available" };

    // ─────────────────────────────────────────
    // 8. TOP 5 PRODUCTS BY QUANTITY SOLD
    //    (product movement leaderboard)
    // ─────────────────────────────────────────
    const topProductsResult = await AllOrdersPlacedModel.aggregate([
      { $unwind: "$productList" },
      {
        $group: {
          _id: "$productList.productId",
          totalQuantity: { $sum: "$productList.quantity" },
          totalRevenue:  { $sum: { $multiply: ["$productList.quantity", { $ifNull: ["$productList.price", 0] }] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
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
          productId:     "$_id",
          name:          "$productInfo.name",
          totalQuantity: 1,
          totalRevenue:  1,
          currentStock:  "$productInfo.stock",
          category:      "$categoryInfo.name",
        },
      },
    ]);

    // ─────────────────────────────────────────
    // 9. TOP CATEGORIES BY REVENUE
    // ─────────────────────────────────────────
    const topCategoriesResult = await AllOrdersPlacedModel.aggregate([
      { $unwind: "$productList" },
      {
        $lookup: {
          from: "products",
          localField: "productList.productId",
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
        $group: {
          _id:           "$categoryInfo._id",
          categoryName:  { $first: "$categoryInfo.name" },
          totalRevenue:  { $sum: { $multiply: ["$productList.quantity", { $ifNull: ["$productList.price", 0] }] } },
          totalQuantity: { $sum: "$productList.quantity" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          name:          "$categoryName",
          totalRevenue:  1,
          totalQuantity: 1,
        },
      },
    ]);

    // ─────────────────────────────────────────
    // 10. LAST 7 DAYS — daily order counts
    //     (for sparklines / trend chart)
    // ─────────────────────────────────────────
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      last7Days.push({ dayStart, dayEnd, label: d.toLocaleDateString("en-NG", { weekday: "short" }) });
    }

    const dailyOrders = await Promise.all(
      last7Days.map(({ dayStart, dayEnd, label }) =>
        AllOrdersPlacedModel.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } })
          .then(count => ({ label, count }))
      )
    );

    // ─────────────────────────────────────────
    // 11. SELL-THROUGH RATE
    //     = total units sold all time / (total units sold + current stock)
    // ─────────────────────────────────────────
    const totalUnitsSoldResult = await AllOrdersPlacedModel.aggregate([
      { $unwind: "$productList" },
      { $group: { _id: null, totalSold: { $sum: "$productList.quantity" } } },
    ]);
    const totalUnitsSold = totalUnitsSoldResult[0]?.totalSold || 0;
    const sellThroughRate = (totalUnitsSold + totalStock) > 0
      ? Math.round((totalUnitsSold / (totalUnitsSold + totalStock)) * 100)
      : 0;

    // ─────────────────────────────────────────
    // 12. AVERAGE ORDER VALUE
    // ─────────────────────────────────────────
    const totalOrders = await AllOrdersPlacedModel.countDocuments();
    const avgOrderValue = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;

    // ─────────────────────────────────────────
    // ASSEMBLE
    // ─────────────────────────────────────────
    const dashboardData = {
      // original fields (unchanged — no breaking changes)
      totalProducts,
      totalStock,
      ordersToday,
      revenue,
      outOfStock,
      highestSaleProduct,
      lowStock,

      // new enriched fields
      revenueToday,
      revenueYesterday,
      revenueChange,
      ordersYesterday,
      ordersChange,
      stockHealthScore,
      totalUnitsSold,
      sellThroughRate,
      avgOrderValue,
      topProducts:    topProductsResult,
      topCategories:  topCategoriesResult,
      dailyOrders,    // [{label:"Mon", count:12}, ...]
    };

    return sendResponse(res, 200, { dashboardData }, "Dashboard data retrieved successfully");
  } catch (error) {
    console.error("Dashboard error:", error);
    return sendError(res, 500, "Error fetching dashboard summary");
  }
};

export { getData };