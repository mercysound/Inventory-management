import mongoose from "mongoose";

const completeOrder = async (req, res) => {
  if (!paymentMethod) {
  return res.status(400).json({
    success: false,
    message: "Payment method required",
  });
}
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { paymentMethod, buyerName } = req.body;
    const userId = req.user._id;

    const orders = await OrderModel.find({ userOrdering: userId })
      .populate("product")
      .session(session);

    if (!orders.length) {
      throw new Error("No active orders");
    }

    // 🔥 ATOMIC STOCK REDUCTION
    for (const o of orders) {

      const updated = await ProductModel.findOneAndUpdate(
        {
          _id: o.product._id,
          stock: { $gte: o.quantity }
        },
        { $inc: { stock: -o.quantity } },
        { new: true, session }
      );

      if (!updated) {
        throw new Error(`Insufficient stock for ${o.product.name}`);
      }
    }

    const totalPrice = orders.reduce(
      (sum, o) => sum + o.quantity * o.price, 0
    );

    const allQuantity = orders.reduce(
      (sum, o) => sum + o.quantity, 0
    );

    const productList = orders.map(o => ({
      productId: o.product._id,
      quantity: o.quantity,
      price: o.price,
      totalPrice: o.quantity * o.price,
    }));

    let placed;

    if (req.user.role === "customer") {

      placed = await AllOrdersPlacedModel.create([{
        userOrdering: userId,
        buyerName: buyerName || "Customer",
        paymentMethod,
        totalPrice,
        allQuantity,
        productList,
        paid: true,
        deliveryStatus: "Pending",
      }], { session });

    } else {

      placed = await CompletedOrderHistoryModel.create([{
        userOrdering: userId,
        buyerName: buyerName || "Walk-in Customer",
        paymentMethod,
        totalPrice,
        allQuantity,
        productList,
        paid: true,
        deliveryStatus: "Completed",
      }], { session });

    }

    await OrderModel.deleteMany(
      { userOrdering: userId },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Order completed successfully",
      orderId: placed[0]._id,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
