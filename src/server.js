require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const session = require('express-session');
const passport = require('./config/passport'); // ✅ เรียกใช้ Passport config

// Import Config Database
const sequelize = require('./config/database');

const app = express();

// -----------------------------------------------------------------------------
// 1. Config View Engine & Static Files
// -----------------------------------------------------------------------------
app.set("view engine", "ejs");
// ชี้ไปที่ folder views (ถอยกลับไป 1 ชั้นเพราะไฟล์นี้อยู่ใน src)
app.set('views', path.join(__dirname, '../views')); 
app.use(express.static(path.join(__dirname, '../public')));

// -----------------------------------------------------------------------------
// 2. Middleware & Session
// -----------------------------------------------------------------------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Config Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'IT_Portal_Secret_Key_Change_Me',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000 // 1 วัน
    }
}));

// ✅ Passport Middleware (ต้องวางต่อจาก Session เสมอ)
app.use(passport.initialize());
app.use(passport.session());

// Global Variables
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});

// -----------------------------------------------------------------------------
// 3. Routes
// -----------------------------------------------------------------------------

// ✅ [ทางเลือกที่ 2] เพิ่ม Redirect: ถ้าเข้า /login ให้ดีดไป /auth/login
app.get('/login', (req, res) => {
    res.redirect('/auth/login');
});

// ✅ เพิ่ม Redirect: ถ้าเข้า /logout ให้ดีดไป /auth/logout
app.get('/logout', (req, res) => {
    res.redirect('/auth/logout');
});

// Auth Routes (ระบบ Login)
app.use('/auth', require('./routes/authRoutes')); 

// User Management Routes (ระบบจัดการผู้ใช้)
app.use('/', require('./routes/users')); 

// Logs Routes (ระบบ Logs)
app.use('/', require('./routes/logs'));

// -----------------------------------------------------------------------------
// 4. Start Server & Database
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;

// เชื่อมต่อ Database และสร้างตาราง
sequelize.sync()
  .then(() => {
      console.log("✅ Database Connected & Audit Log Table Ready!");
      
      app.listen(PORT, () => {
          console.log(`🚀 IT Admin Portal running on port ${PORT}`);
          console.log(`🔗 http://localhost:${PORT}/login`);
      });
  })
  .catch((err) => {
      console.error("❌ Database Connection Failed:", err.message);
      
      app.listen(PORT, () => {
          console.log(`⚠️ Server running without Database Log on port ${PORT}`);
      });
  });