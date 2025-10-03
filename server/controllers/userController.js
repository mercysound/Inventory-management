import UserModel from '../models/UserModel.js'
import bcrypt from 'bcrypt'

const addUser = async (req, res) => {
  try {
    const { name, email, password, address, role } = req.body;

    //check if the category already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' })
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create a new category
    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
      address,
      role
    });

    await newUser.save();
    return res.status(201).json({ success: true, message: 'User added succesfully' })
  } catch (error) {
    console.error("Error adding user", error);
    return res.status(500).json({ success: false, message: "server error" })
  }
}


const getUsers = async (req, res) => {
  try {
    const users = await UserModel.find();
    return res.status(200).json({ success: true, users })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error in categories" })
  }
}
const getUser = async (req, res) => {
  try {
    const userId = req.user._id; /// assuming the user ID is stored in req.user after authentication

    // Fetch the user from the Database
    const user = await UserModel.findById(userId).select('-password'); // exclude password from the response
    if (!user) {
      return res.status(404).json({success:false, message: "User not found"});
    }
    return res.status(200).json({success:true, user});
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error in categories" })
  }
}

const updateUserprofile = async (req, res) => {
  try {
    const userId = req.user._id; // Assuring the user ID is stored in req.user after authentication
    const { name, email, address, password} = req.body;

    const updateData = {name, email, address};
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword
    }

    const user = await UserModel.findByIdAndUpdate(userId, updateData, {new:true}) // Exclude password from the response
    if (!user) {
      return res.status(404).json({success: false, message: "user not found"});
    }
    return res.status(201).json({ success: true, message: 'User added succesfully' })
  } catch (error) {
    console.error("Error adding user", error);
    return res.status(500).json({ success: false, message: "server error" })
  }
}

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    //check if the category exists
    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    await UserModel.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'user deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}


export { addUser, getUser, deleteUser, getUsers, updateUserprofile }
