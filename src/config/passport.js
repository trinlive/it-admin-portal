const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// แปลง User เป็น ID เพื่อเก็บใน Session
passport.serializeUser((user, done) => {
    done(null, user);
});

// แปลง ID กลับเป็น User
passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
(accessToken, refreshToken, profile, done) => {
    try {
        // ดึงอีเมลจาก Google Profile
        const email = profile.emails[0].value; 
        
        // ------------------------------------------------------------------
        // ✅ Logic: ตรวจสอบ Whitelist Email
        // ------------------------------------------------------------------
        let isAllowed = false;
        
        if (process.env.ALLOWED_EMAILS) {
            // 1. แปลง String ใน .env ให้เป็น Array
            // ใช้ .split(',') เพื่อแยกคำ และ .map(e => e.trim()) เพื่อลบช่องว่างหัวท้าย
            const allowedList = process.env.ALLOWED_EMAILS.split(',').map(e => e.trim().toLowerCase());
            
            // 2. ตรวจสอบว่า email ปัจจุบัน (ตัวเล็กหมด) มีอยู่ใน list หรือไม่
            if (allowedList.includes(email.toLowerCase())) {
                isAllowed = true;
            }
        }

        // ❌ ถ้าไม่อยู่ในรายการ -> ดีดออกทันที
        if (!isAllowed) {
            console.warn(`⛔ [Access Denied] Blocked login attempt from: ${email}`);
            return done(null, false, { message: `Access Denied: ${email} is not authorized.` });
        }

        // ------------------------------------------------------------------
        // ✅ Login Success: สร้าง User Object เข้า Session
        // ------------------------------------------------------------------
        const user = {
            username: email.split('@')[0],       // ใช้ชื่อหน้า email เป็น username (เช่น trinyah)
            sAMAccountName: email.split('@')[0], // map ให้ตรงกับ field ของ AD เดิม เพื่อให้ Controller ทำงานต่อได้
            cn: profile.displayName,             // ชื่อที่แสดง
            email: email,
            picture: profile.photos ? profile.photos[0].value : null,
            isAdmin: true,                       // ให้สิทธิ์ Admin (เพราะผ่าน Whitelist มาแล้ว)
            loginType: 'google'
        };

        console.log(`✅ [Login Success] User: ${email}`);
        return done(null, user);

    } catch (err) {
        console.error("🔥 Passport Strategy Error:", err);
        return done(err);
    }
}));

module.exports = passport;