import bcrypt from 'bcrypt';
import User from './models/UserModel.js';
import connectDb from './db/connection.js';

const register = async () =>{
  try {
    const hashPassword = await bcrypt.hash("admin", 10);
    const newUser = new User({
      name: "admin",
      email: "admin@gmail.com",
      password: hashPassword,
      address: "admin address",
      role: "admin"
    });
    connectDb();
    // const hashPassword = await bcrypt.hash("customer", 10);
    // const newUser = new User({
    //   name: "customer",
    //   email: "customer@gmail.com",
    //   password: hashPassword,
    //   address: "admin address",
    //   role: "customer"
    // });
    await newUser.save();
    console.log("Admin user created Successfully");
    
  } catch (error) {
    console.log(error);
  }
}

register()