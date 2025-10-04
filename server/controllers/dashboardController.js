import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js"

const getData = async (req, res)=>{
  try {
    const totalProducts = await ProductModel.countDocuments();

  const stockResult = await ProductModel.aggregate([
    {$group: {_id:null, totalStock: {$sum: "$stock"}}}
  ])

  
  const totalStock = stockResult[0]?.totalStock || 0;

  //start of day
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const ordersToday = await OrderModel.countDocuments({
    orderDate:{$gte: startOfDay, $lte: endOfDay}
  });

  const revenueResult = await OrderModel.aggregate([
    {$group:{_id:null, totalRevenue: {$sum: '$totalPrice'}}}
  ])

  const revenue = revenueResult[0]?.totalRevenue || 0;

  const outOfStock = await ProductModel.find({stock:0})
  .select('name stock')
  .populate('categoryId', 'name')

  // high sale product
  const highestSaleResult = await OrderModel.aggregate([
    {$group: {_id: '$product', totalQuantity: {$sum: '$quantity'} }},
    {$sort: {totalQuantity: -1}},
    {$limit: 1},
    {
      $lookup:{
        from: "products",
        localField: '_id',
        foreignField: '_id',
        as: "product"
      }
    },
    {$unwind: "$product"},
    {
      $lookup:{
        from: "categories",
        localField: "product.categoryId",
        foreignField: "_id",
        as: "product.categoryId"
      }
    },
    {$unwind: "$product.categoryId"},
    {
      $project: {
        name: "$product.name",
        category: '$product.categoryId.name',
        totalQuantity: 1,
      }
    }

  ])

  const highestSaleProduct = highestSaleResult[0] || {message: "No sale data available"};

  // low sale stock
  const lowStock = await ProductModel.find({stock: {$gt: 0, $lt:5}})
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