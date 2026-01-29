require('dotenv').config();

const config = {
    url: process.env.AD_URL || "ldap://localhost",
    baseDN: process.env.AD_BASE_DN,
    username: process.env.AD_USER,
    password: process.env.AD_PASS,
    attributes: {
        user: [
            "dn", 
            "cn", 
            "sn", 
            "givenName", 
            "sAMAccountName", 
            "userPrincipalName", 
            "mail", 
            "department", 
            "description", 
            "whenCreated",      // วันที่สร้าง Account
            "lastLogon",        // ✅ เวลาเข้าใช้งานล่าสุด (Real-time)
            "memberOf",         // ✅ รายชื่อ Group AD ที่สังกัด
            "userAccountControl" // ✅ เพิ่มเพื่อใช้ตรวจสอบสถานะ เปิด/ปิด บัญชี
        ],
    },
};



module.exports = config;