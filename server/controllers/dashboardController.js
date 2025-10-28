import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js"

const getData = async (req, res)=>{
  try {
    const totalProducts = await ProductModel.find({ isDeleted: false }).countDocuments();

  const stockResult = await ProductModel.aggregate([
    { $match: { isDeleted: false } }, // filter only non-deleted orders
    {$group: {_id:null, totalStock: {$sum: "$stock"}}}
  ]);
  
  
  const totalStock = stockResult[0]?.totalStock || 0;

  //start of day
  const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date();
endOfDay.setHours(23, 59, 59, 999);

const ordersToday = await AllOrdersPlacedModel.countDocuments({
  createdAt: { $gte: startOfDay, $lte: endOfDay },
});

  const revenueResult = await AllOrdersPlacedModel.aggregate([
    // { $match: { isDeleted: false } }, // filter only non-deleted orders
    {$group:{_id:null, totalRevenue: {$sum: '$totalPrice'}}}
  ]);
  

  const revenue = revenueResult[0]?.totalRevenue || 0;

  const outOfStock = await ProductModel.find({stock:0})
  .select('name stock')
  .populate('categoryId', 'name')

  // high sale product
const highestSaleResult = await AllOrdersPlacedModel.aggregate([
      { $unwind: "$productList" }, // flatten productList array
      {
        $group: {
          _id: "$productList",
          totalQuantity: { $sum: "$allQuantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 0,
          name: "$_id", // match frontend key
          totalQuantity: 1,
          category: "N/A", // default category
        },
      },
    ]);

  const highestSaleProduct = highestSaleResult[0] || {message: "No sale data available"};

  // low sale stock
  const lowStock = await ProductModel.find({ 
    isDeleted: false,
    stock: {$gt: 0, $lt:5}})
  .select("name stock")
  .populate("categoryId", "name");

  const dashboardData = {
    totalProducts,
    totalStock,
    ordersToday,
    revenue,
    outOfStock,
    highestSaleProduct,
    lowStock,
  }
  return res.status(200).json({success: true, dashboardData})
} catch (error) {
    console.log(error);
    return res.status(500).json({success: false, message: "error fetching dashboard summary"})
    
  }

}
export{getData};