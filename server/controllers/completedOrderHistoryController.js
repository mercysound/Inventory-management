import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";

// ✅ Get all completed orders
export const getCompletedOrders = async (req, res) => {
  try {
    // const orders = await CompletedOrderHistoryModel.find()
    //   .populate("userOrdering", "name email")
    //   .populate("productList.productId", "name categoryId description")
    //   .populate({
    //     path: "productList.productId.categoryId",
    //     select: "name",
    //   })
    //   .sort({ createdAt: -1 });
    const orders = await CompletedOrderHistoryModel.find()
  .populate("userOrdering", "name email")
  .populate({
    path: "productList.productId",
    select: "name categoryId description",
    populate: { path: "categoryId", select: "name" }
  })
  .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error("getCompletedOrders error:", error);
    res.status(500).json({ success: false, message: "Error fetching completed orders" });
  }
};

// ✅ Delete single completed order
export const deleteCompletedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CompletedOrderHistoryModel.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("deleteCompletedOrder error:", error);
    res.status(500).json({ success: false, message: "Error deleting order" });
  }
};

// ✅ Clear all completed orders
export const clearCompletedOrders = async (req, res) => {
  try {
    await CompletedOrderHistoryModel.deleteMany({});
    res.json({ success: true, message: "All completed orders cleared successfully" });
  } catch (error) {
    console.error("clearCompletedOrders error:", error);
    res.status(500).json({ success: false, message: "Error clearing orders" });
  }
};
