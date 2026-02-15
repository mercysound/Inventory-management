import UserModel from '../models/UserModel.js'
import bcrypt from 'bcrypt'

const addUser = async (req, res) => {
  try {
    const { name, address, phone, email, password, role } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "User already exists" });

    let assignedRole = "customer"; // default

    // 🔒 If admin is creating user internally
    if (req.user && req.user.role === "admin") {
      if (["admin", "staff", "customer"].includes(role)) { 
        assignedRole = role;
      }
    } // this part doesn't needed bcs it's already donein schema num

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await UserModel.create({
      name,
      address,
      phone,
      email,
      password: hashedPassword,
      role: assignedRole,
      profileCompleted: true,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};




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
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error in categories" })
  }
}

const updateUserprofile = async (req, res) => {
  try {
    const userId = req.user._id; // Assuring the user ID is stored in req.user after authentication
    const { name, email, address, password } = req.body;

    const updateData = { name, email, address };
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword
    }

    const user = await UserModel.findByIdAndUpdate(userId, updateData, { new: true }) // Exclude password from the response
    if (!user) {
      return res.status(404).json({ success: false, message: "user not found" });
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

const updateProfile = async (req, res) => {
  try {
    const { phone, address } = req.body;
    const userId = req.user.id;

    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { phone, address, profileCompleted: true },
      { new: true }
    ).select("-password");

    return res.status(200).json({ success: true, message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Complete profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



export { addUser, getUser, deleteUser, getUsers, updateUserprofile, updateProfile }
