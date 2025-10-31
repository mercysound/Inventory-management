import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";

// ✅ Get all placed orders
export const getAllPlacedOrders = async (req, res) => {
  try {
    const orders = await AllOrdersPlacedModel.find()
  .populate("userOrdering", "name email")
  .populate({
    path: "productList.productId",
    select: "name categoryId description",
    populate: { path: "categoryId", select: "name" }
  })
  .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error("getAllPlacedOrders error:", error);
    res.status(500).json({ success: false, message: "Error fetching placed orders" });
  }
};

// ✅ Update delivery status
// ✅ Update delivery status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStatus } = req.body;

    const updated = await AllOrdersPlacedModel.findByIdAndUpdate(
      id,
      { deliveryStatus },
      { new: true }
    ).populate({
      path: "productList.productId",
      select: "name categoryId description",
      populate: { path: "categoryId", select: "name" }
    });

    if (!updated)
      return res.status(404).json({ success: false, message: "Order not found" });

    // ✅ Automatically move delivered orders to CompletedOrderHistory
    if (deliveryStatus === "delivered") {
      await CompletedOrderHistoryModel.create({
        userOrdering: updated.userOrdering._id,
        buyerName: updated.buyerName,
        paymentMethod: updated.paymentMethod,
        deliveryStatus: updated.deliveryStatus,
        totalPrice: updated.totalPrice,
        allQuantity: updated.allQuantity,
        productList: updated.productList,
      });

      // Delete from placed orders
      await AllOrdersPlacedModel.findByIdAndDelete(id);
    }

    res.json({
      success: true,
      message: "Delivery status updated successfully",
      order: updated,
    });
  } catch (error) {
    console.error("updateDeliveryStatus error:", error);
    res.status(500).json({ success: false, message: "Error updating delivery status" });
  }
};


// ✅ Clear all placed orders
export const clearAllPlacedOrders = async (req, res) => {
  try {
    await AllOrdersPlacedModel.deleteMany({});
    res.json({ success: true, message: "All placed orders cleared successfully" });
  } catch (error) {
    console.error("clearAllPlacedOrders error:", error);
    res.status(500).json({ success: false, message: "Error clearing orders" });
  }
};
// ✅ Delete single placed order
export const deletePlacedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AllOrdersPlacedModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("deletePlacedOrder error:", error);
    res.status(500).json({ success: false, message: "Error deleting order" });
  }
};
