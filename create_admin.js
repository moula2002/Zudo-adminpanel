// Save as create_admin.js and run: node create_admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const admin = await Admin.create({
      name: "Admin User",
      email: "your_email@gmail.com",
      password: "your_new_password",
      role: "super_admin"
    });
    console.log("Admin created successfully");
    process.exit();
  })
  .catch(err => console.error(err));
