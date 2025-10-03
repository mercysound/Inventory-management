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
 const getOrders = async (req, res)=>{
   
   try {
     const userId = req.user._id;
     let query = {};
     if (req.user.role === "customer") {
      query= {customer: userId}
     }
    const orders = await OrderModel.find(query)
    .populate({path:'product', select: 'name description price', populate:{path: 'categoryId', select: "name"},})
    .populate('customer', 'name email');
     
    return res.status(200).json({success: true, orders});
  } catch (error) {
    return res.status(500).json({success: false, error: "Server error in fetching orders"});
    
  }
 }

export {addOrder, getOrders}