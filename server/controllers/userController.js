import UserModel from '../models/UserModel.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';

const addUser = async (req, res) => {
  try {
    const { name, address, phone, email, password, role } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser)
      return sendError(res, 400, "User already exists");

    let assignedRole = "customer"; // default

    // 🔒 If admin is creating user internally
    if (req.user && req.user.role === "admin") {
      if (["admin", "staff", "customer"].includes(role)) { 
        assignedRole = role;
      }
    }

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

    // Generate JWT token for auto-login
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    return sendResponse(res, 201, {
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        picture: newUser.picture || "",
        phone: newUser.phone || "",
        address: newUser.address || "",
        profileCompleted: newUser.profileCompleted,
      }
    }, "User created successfully");

  } catch (error) {
    console.error('Error adding user:', error);
    return sendError(res, 500, `Failed to create user: ${error.message}`);
  }
};




const getUsers = async (req, res) => {
  try {
    const { skip, limit, page, sort } = getPaginationParams(req);
    const total = await UserModel.countDocuments();
    
    const users = await UserModel.find()
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const meta = getPaginationMeta(total, limit, page);
    return sendResponse(res, 200, { users }, "Users retrieved successfully", meta);
  } catch (error) {
    console.error('Error fetching users:', error);
    return sendError(res, 500, "Failed to fetch users");
  }
};

const getUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return sendError(res, 404, "User not found");
    }
    return sendResponse(res, 200, user, "User retrieved successfully");
  } catch (error) {
    console.error('Error fetching user:', error);
    return sendError(res, 500, "Failed to fetch user");
  }
};

const updateUserprofile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email, address, oldPassword, password } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) return sendError(res, 404, "User not found");

    const updateData = { name, email, address };

    // Only process password change if both oldPassword and new password are provided
    if (password && password.trim() !== "") {
      if (!oldPassword) {
        return sendError(res, 400, "Current password is required to set a new password");
      }

      // ✅ Verify old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return sendError(res, 400, "Current password is incorrect");
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    return sendResponse(res, 200, updatedUser, "Profile updated successfully");
  } catch (error) {
    console.error("Error updating user profile:", error);
    return sendError(res, 500, "Failed to update user profile");
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      return sendError(res, 404, "User not found");
    }

    await UserModel.findByIdAndDelete(id);
    return sendResponse(res, 200, null, "User deleted successfully");
  } catch (error) {
    console.error('Error deleting user:', error);
    return sendError(res, 500, "Failed to delete user");
  }
};

const updateProfile = async (req, res) => {
  try {
    const { phone, address } = req.body;
    const userId = req.user._id;

    if (!phone) return sendError(res, 400, "Phone number is required");

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { phone, address, profileCompleted: true },
      { new: true }
    ).select("-password");

    // Return with 'user' key for frontend compatibility
    return sendResponse(res, 200, {
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        picture: updatedUser.picture || "",
        phone: updatedUser.phone || "",
        address: updatedUser.address || "",
        profileCompleted: updatedUser.profileCompleted,
      }
    }, "Profile updated successfully");
  } catch (error) {
    console.error("Error updating profile:", error);
    return sendError(res, 500, `Failed to update profile: ${error.message}`);
  }
};



export { addUser, getUser, deleteUser, getUsers, updateUserprofile, updateProfile }
