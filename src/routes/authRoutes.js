const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');

// -----------------------------------------------------------------------------
// 1. หน้า Login
// -----------------------------------------------------------------------------
// URL: /auth/login
router.get('/login', authController.getLoginPage);

// -----------------------------------------------------------------------------
// 2. Google Authentication
// -----------------------------------------------------------------------------
// 🚀 เริ่มต้น Login (URL: /auth/google)
// ส่งผู้ใช้ไปที่หน้า Login ของ Google
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

// 🔙 Google ส่งกลับมา (URL: /auth/google/callback)
router.get('/google/callback', 
    passport.authenticate('google', { 
        // ถ้า Login ไม่ผ่าน ให้กลับไปหน้า Login พร้อม error parameter
        failureRedirect: '/auth/login?error=GoogleAuthFailed' 
    }),
    (req, res) => {
        // ✅ Login ผ่านแล้ว
        // เก็บข้อมูล User ลง Session เพื่อให้ระบบจำได้ว่าล็อกอินแล้ว
        req.session.user = req.user;
        
        console.log(`✅ Login Success via Google: ${req.user.email}`);
        
        // ส่งไปหน้า Dashboard (หน้าแรก)
        res.redirect('/');
    }
);

// -----------------------------------------------------------------------------
// 3. Logout
// -----------------------------------------------------------------------------
// URL: /auth/logout
router.get('/logout', authController.logout);

module.exports = router;