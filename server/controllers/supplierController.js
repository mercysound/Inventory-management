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

    return res.status(500).json({ success: false, message: "Server error in suppliers" })
  }
}

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, number, address } = req.body
    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      return res.status(404).json({ success: false, message: ' Supplier not found' })
    }

    const updateSupplier = await Supplier.findByIdAndUpdate(
      id,
      { name, email, number, address },
      { new: true }
    );
    return res.status(200).json({ success: true, message: 'Supplier updated successfully!' });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({success: false, message:'Server error'})
  
  }
}

const deleteDelete = async (req, res) =>{
  try {
    const {id} = req.params;
  const existingSupplier = await Supplier.findById(id);
  if (!existingSupplier) {
    return res.status(404).json({ success: false, message: ' Supplier not found'})
  }

  await Supplier.findByIdAndDelete(id);
  return res.status(200).json({success: true, message: 'Supplier deleted successfully'})
  } catch (error) {
    console.error('Error deleting supplier', error);
    return res.status(500).json({success: false, message: 'Server error'})
  }
}

export { addSupplier, getSupplier, updateSupplier, deleteDelete }
