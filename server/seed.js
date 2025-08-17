import bcrypt from 'bcrypt';
import User from './models/UserModel.js';
import connectDb from './db/connection.js';

const register = async () =>{
  try {
    connectDb();
    const hashPassword = await bcrypt.hash("admin", 10);
    const newUser = new User({
      name: "admin",
      email: "admin@gmail.com",
      password: hashPassword,
      address: "admin address",
      role: "admin"
    });

    await newUser.save();
    console.log("Admin user created Successfully");
    
  } catch (error) {
    console.log(error);
  }
}

register()