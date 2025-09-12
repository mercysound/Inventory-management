import Supplier from '../models/SupplierModel.js'

const addSupplier = async (req, res) => {
  try {
    const { name, email, number, address } = req.body
    //check if the category already exists
    const existingSupplier = await Supplier.findOne({ name });
    if (existingSupplier) {
      return res.status(409).json({ success: false, message: 'Supplier already exists' }) // 409 = Conflict
    }
    // Create a new category
    const newSupplier = new Supplier({
      name,
      email,
      number,
      address
    });

    await newSupplier.save();
    return res.status(201).json({ success: true, message: 'Supplier added succesfully' }) // 201 = Created
  } catch (error) {
    console.error("Error adding supplier", error);
    return res.status(500).json({ success: false, message: "server error" }) // 500 = Internal error
  }
}
const getSupplier = async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    return res.status(200).json({ success: true, suppliers })
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    
    return res.status(500).json({success:false, message: "Server error in suppliers"})
  } 
}

export { addSupplier, getSupplier}
