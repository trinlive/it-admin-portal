// src/controllers/authController.js

// -----------------------------------------------------------------------------
// 1. แสดงหน้า Login
// -----------------------------------------------------------------------------
exports.getLoginPage = (req, res) => {
    // ถ้า User Login ค้างไว้อยู่แล้ว ให้เด้งไปหน้าแรกเลย (ไม่ต้อง Login ซ้ำ)
    if (req.session.user) {
        return res.redirect('/');
    }

    // Render หน้า login.ejs พร้อมส่ง error (ถ้ามี) ไปแสดงผล
    res.render('login', { 
        error: req.query.error || null 
    });
};

// -----------------------------------------------------------------------------
// 2. ออกจากระบบ (Logout)
// -----------------------------------------------------------------------------
exports.logout = (req, res) => {
    // ลบ Session ทิ้ง
    req.session.destroy((err) => {
        if (err) {
            console.error("❌ Logout Error:", err);
            return res.redirect('/');
        }
        
        // ลบ Cookie ของ Session
        res.clearCookie('connect.sid'); // 'connect.sid' คือชื่อ Default ของ express-session
        
        console.log("👋 User Logged Out");
        
        // ส่งกลับไปหน้า Login
        res.redirect('/auth/login');
    });
};