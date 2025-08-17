import bycrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/UserModel';

const login = async (req, res) =>{
  try {
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if(!user){
      return res.status(401).json({succcess:false, message:"User not found"});

      const isMatch = bycrypt.compare(password, user.password);

      if(!isMatch){
        return res.status(401).json({success: false, message: "Invalid credentials"});
      };
      const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '1h'})
    } 
  } catch (error) {
    
  }
}