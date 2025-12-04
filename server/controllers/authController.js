import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';
import { OAuth2Client } from "google-auth-library";


const JWT_SECRET = process.env.JWT_SECRET;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2d' });

    return res.status(200).json({ success: true, message: "login successful", token, 
      // user: { id: user._id, name: user.name, email: user.email, role: user.role },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture || "",
        phone: user.phone || "",
        address: user.address || "",
        profileCompleted: user.profileCompleted,  //🔥 ADD THIS
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
const googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();


    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // New user → create automatically
      const password = await bcrypt.hash(email + JWT_SECRET, 10); // pseudo-password
      user = await User.create({
        name,
        email,
        password,
        role: "customer",  // default role
        profileCompleted: false,   // ❗ Google users must complete profile
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "2d" }
    );

    // Send full user details including profileCompleted status
    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture,
        phone: user.phone || "",
        address: user.address || "",
        profileCompleted: user.profileCompleted,  //🔥 ADD THIS
      },
    });

  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({ success: false, message: "Google login failed" });
  }
};

export { login, googleLogin };