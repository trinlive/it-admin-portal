require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();

// ตั้งค่า View Engine
app.set("view engine", "ejs");
// แก้ path view engine ให้ชี้ไปที่โฟลเดอร์ views ให้ถูกต้อง (เผื่อรันจาก root)
app.set('views', path.join(__dirname, '../views')); 
app.use(express.static(path.join(__dirname, '../public')));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Import Routes
const userRoutes = require('./routes/users');

// Use Routes
app.use('/', userRoutes);

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 IT Admin Portal running on port ${PORT}`);
});