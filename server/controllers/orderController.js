import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";

const addOrder = async (req, res) =>{
 try {
    const {productId, quantity, total} = req.body;
    const userId = req.user._id; 
    const product = await ProductModel.findById({_id: productId});
    if (!product) {
      return res.status(404).json({error:"product not found in order"})
    }

    if (quantity > product.stock) {
      return res.status(404).json({error:"Not enough stock"})
    }
    // else{
    //   product.stock -= parseInt(quantity);
    //   await product.save(); 
    // }

    const orderObj = new OrderModel({
      userOrdering: userId, 
      product: productId,
      quantity,
      totalPrice: total
    })
    orderObj.save();
      return res.status(200).json({success: true, message: 'Order added successfully'})
 } catch (error) {
      return res.status(500).json({success: false, error:"server error in adding order"})
  
 }
}
 const getOrders = async (req, res)=>{
   
   try {
     const userId = req.user._id;
     let query = {};
     if (req.user.role === "staff") {
      query= {userOrdering: userId}
     }
    const orders = await OrderModel.find(query)
    .populate({path:'product', select: 'name description price', populate:{path: 'categoryId', select: "name"},})
    .populate('userOrdering', 'name email role');
    
    return res.status(200).json({success: true, orders});
  } catch (error) {
    return res.status(500).json({success: false, error: "Server error in fetching orders"});
    
  }
 }

const getPurchaseHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await OrderModel.find(dateFilter)
      .populate({
        path: "product",
        select: "name categoryId",
        populate: { path: "categoryId", select: "name" },
      })
      .populate("userOrdering", "name email")
      .sort({ orderDate: -1 });

    // Group by date
    const grouped = orders.reduce((acc, order) => {
      const date = order.orderDate.toISOString().split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {});

    const history = Object.entries(grouped).map(([date, orders]) => ({
      _id: date,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalPrice, 0),
      orders: orders.map((o) => ({
        _id: o._id,
        product: o.product?.name || "—",
        category: o.product?.categoryId?.name || "—",
        quantity: o.quantity,
        totalPrice: o.totalPrice,
        orderedBy: o.userOrdering?.name || "—",
      })),
    }));

    res.json({ success: true, history });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// 🧹 Clear all purchase history
 const clearAllHistory = async (req, res) => {
  try {
    await OrderModel.deleteMany({});
    res.json({ success: true, message: "All purchase history cleared successfully." });
  } catch (error) {
    console.error("Error clearing all history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// 🧹 Clear purchase history by specific date
 const clearHistoryByDate = async (req, res) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ success: false, message: "Date parameter is required" });
    }

    // Convert the provided date (YYYY-MM-DD) to a date range for the entire day
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const result = await OrderModel.deleteMany({
      orderDate: { $gte: start, $lt: end },
    });

    res.json({
      success: true,
      message: `Purchase history for ${date} cleared (${result.deletedCount} record(s) removed).`,
    });
  } catch (error) {
    console.error("Error clearing history by date:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export {addOrder, getOrders, getPurchaseHistory, clearAllHistory, clearHistoryByDate}