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
const isProduction = process.env.NODE_ENV === 'production'; // 👈 เช็คว่าเป็น Prod หรือ Dev

// -----------------------------------------------------------------------------
// 0. Trust Proxy (สำคัญมากสำหรับ Cloudflare Tunnel)
// -----------------------------------------------------------------------------
// ถ้าไม่เปิดบรรทัดนี้ Google Auth จะ Error ว่า redirect_uri mismatch เวลาอยู่บน https
app.set('trust proxy', 1); 

// -----------------------------------------------------------------------------
// 1. Config View Engine & Static Files
// -----------------------------------------------------------------------------
app.set("view engine", "ejs");
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
    // ⚙️ ตั้งค่า Cookie ให้ฉลาดตาม Environment
    cookie: { 
        secure: isProduction, // ✅ ถ้า Prod เป็น true (https), ถ้า Dev เป็น false (http)
        httpOnly: true,       // ป้องกัน JavaScript เข้าถึง Cookie (เพื่อความปลอดภัย)
        maxAge: 24 * 60 * 60 * 1000 // 1 วัน
    }
}));

// ✅ Passport Middleware (วางต่อจาก Session)
app.use(passport.initialize());
app.use(passport.session());

// Global Variables
app.use((req, res, next) => {
    res.locals.currentUser = req.user || null; // passport จะเก็บ user ใน req.user
    next();
});

// -----------------------------------------------------------------------------
// 3. Routes
// -----------------------------------------------------------------------------

// Redirect Login/Logout ไปที่ Auth Routes
app.get('/login', (req, res) => { res.redirect('/auth/login'); });
app.get('/logout', (req, res) => { res.redirect('/auth/logout'); });

// Auth Routes
app.use('/auth', require('./routes/authRoutes')); 

// User Management Routes
app.use('/', require('./routes/users')); 

// Logs Routes
app.use('/', require('./routes/logs'));

// -----------------------------------------------------------------------------
// 4. Start Server & Database
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;

// เชื่อมต่อ Database และเริ่มรัน Server
sequelize.sync()
  .then(() => {
      console.log("✅ Database Connected & Audit Log Table Ready!");
      
      app.listen(PORT, () => {
          console.log(`---------------------------------------------------`);
          console.log(`🚀 Server running in [${process.env.NODE_ENV || 'development'}] mode`);
          console.log(`🔒 Cookie Secure Mode: ${isProduction ? 'ON (HTTPS)' : 'OFF (HTTP)'}`);
          console.log(`👉 Internal Port: ${PORT}`);
          
          if (!isProduction) {
            console.log(`🔗 Local Access: http://localhost:33201/login`);
          } else {
            console.log(`🔗 Public Access: https://dev.biccorp.com`);
          }
          console.log(`---------------------------------------------------`);
      });
  })
  .catch((err) => {
      console.error("❌ Database Connection Failed:", err.message);
      
      // ให้ Server รันได้แม้ Database จะตาย (ไว้ Debug)
      app.listen(PORT, () => {
          console.log(`⚠️ Server running without Database Log on port ${PORT}`);
      });
  });