// src/server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// ✅ 1. เพิ่มการ Import Config Database
const sequelize = require('./config/database');

const app = express();

// ตั้งค่า View Engine
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../views')); 
app.use(express.static(path.join(__dirname, '../public')));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Import Routes
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');

// Use Routes
app.use('/', userRoutes);
app.use('/', logRoutes);

// ✅ 2. แก้ไขส่วน Start Server ให้ Sync Database ก่อน
const PORT = process.env.PORT || 3001;

// สั่งให้ Sequelize สร้างตาราง (ถ้ายังไม่มี)
sequelize.sync()
  .then(() => {
      console.log("✅ Database Connected & Audit Log Table Ready!");
      
      // เริ่มเปิด Server เมื่อ DB พร้อมแล้ว
      app.listen(PORT, () => {
          console.log(`🚀 IT Admin Portal running on port ${PORT}`);
      });
  })
  .catch((err) => {
      console.error("❌ Database Connection Failed:", err.message);
      
      // กรณีต่อ DB ไม่ได้ ให้เปิด Server ไปก่อน (แต่อาจจะไม่มี Log)
      app.listen(PORT, () => {
          console.log(`⚠️ Server running without Database Log on port ${PORT}`);
      });
  });