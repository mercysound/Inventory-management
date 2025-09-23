import OrderModel from "../models/OrderModel";
import ProductModel from "../models/ProductModel";

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
    }else{
      product.stock -= parseInt(quantity);
      await product.save(); 
    }

    const orderObj = new OrderModel({
      customer: userId, 
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

export {addOrder}