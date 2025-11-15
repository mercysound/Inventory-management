import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";

// ✅ Get all placed orders
export const getAllPlacedOrders = async (req, res) => {
  try {
    let query = {};

    // 🧠 If user is NOT admin → fetch only their orders
    if (req.user.role !== "admin") {
      query.userOrdering = req.user._id;
    }

    const orders = await AllOrdersPlacedModel.find(query)
      .populate("userOrdering", "name role email")
      .populate({
        path: "productList.productId",
        select: "name categoryId description",
        populate: { path: "categoryId", select: "name" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error("getAllPlacedOrders error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching placed orders" });
  }
};


// ✅ Update delivery status

// ✅ Update delivery status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStatus } = req.body;

    // Find the order first
    const order = await AllOrdersPlacedModel.findById(id);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    // Update status
    order.deliveryStatus = deliveryStatus;
    await order.save();

    // ✅ When delivered, move to CompletedOrderHistoryModel
    if (deliveryStatus === "delivered") {
      // Create a completed order record
      await CompletedOrderHistoryModel.create({
        userOrdering: order.userOrdering?._id || order.userOrdering,
        buyerName: order.buyerName,
        paymentMethod: order.paymentMethod,
        deliveryStatus: order.deliveryStatus,
        totalPrice: order.totalPrice,
        allQuantity: order.allQuantity,
        productList: order.productList,
      });

      // ✅ Then delete it from AllOrdersPlacedModel
      await AllOrdersPlacedModel.findByIdAndDelete(id);
    }

    res.json({
      success: true,
      message:
        deliveryStatus === "delivered"
          ? "Order marked delivered and moved to history."
          : "Delivery status updated successfully.",
    });
  } catch (error) {
    console.error("updateDeliveryStatus error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating delivery status" });
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
