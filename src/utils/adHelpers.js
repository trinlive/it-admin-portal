// src/utils/adHelpers.js

// 1. แปลงวันที่สร้าง (whenCreated) เป็น YYYY-MM-DD
exports.formatDate = (dateInput) => {
    if (!dateInput) return "";
    if (typeof dateInput === "string" && dateInput.length >= 8) {
        const yyyy = dateInput.substring(0, 4);
        const mm = dateInput.substring(4, 6);
        const dd = dateInput.substring(6, 8);
        return `${yyyy}-${mm}-${dd}`;
    }
    if (dateInput instanceof Date && !isNaN(dateInput)) {
        return dateInput.toISOString().split("T")[0];
    }
    return "";
};

// 2. แปลง Windows File Time (lastLogon) เป็น DD.MM.YY HH:mm
exports.formatLastLogin = (timestamp) => {
    if (!timestamp || Number(timestamp) === 0) return "-";
    
    // สูตรคำนวณ Windows File Time (100-nanosecond intervals since 1601)
    const lastLogonDate = new Date(timestamp / 10000 - 11644473600000);
    if (lastLogonDate.getFullYear() < 1970) return "-";

    const dd = String(lastLogonDate.getDate()).padStart(2, '0');
    const mm = String(lastLogonDate.getMonth() + 1).padStart(2, '0');
    const yy = String(lastLogonDate.getFullYear()).slice(-2);
    const HH = String(lastLogonDate.getHours()).padStart(2, '0');
    const min = String(lastLogonDate.getMinutes()).padStart(2, '0');
    
    return `${dd}.${mm}.${yy} ${HH}:${min}`;
};

// 3. แปลง memberOf (CN=Group,...) ให้เป็นชื่อ Group สวยๆ
exports.formatGroups = (memberOf) => {
    if (!memberOf) return [];
    const groups = Array.isArray(memberOf) ? memberOf : [memberOf];
    return groups.map(g => {
        const match = g.match(/^CN=([^,]+)/);
        return match ? match[1] : g;
    });
};

// 4. เช็ค Account ที่ห้ามแก้ไข/ห้ามลบ (Strict)
exports.isSystemAccountStrict = (identifier) => {
    if (!identifier) return false;
    const lowerId = identifier.toLowerCase();
    return lowerId.includes("cn=administrator") || lowerId === "administrator" ||
           lowerId.includes("cn=guest") || lowerId === "guest" ||
           lowerId.includes("cn=krbtgt") || lowerId === "krbtgt";
};

// 5. เช็ค Account ที่ห้าม Reset Password (ยอมให้ Admin รีเซ็ตได้)
exports.isNonResetableAccount = (identifier) => {
    if (!identifier) return false;
    const lowerId = identifier.toLowerCase();
    return lowerId.includes("cn=guest") || lowerId === "guest" ||
           lowerId.includes("cn=krbtgt") || lowerId === "krbtgt";
};

// 6. ✅ ฟังก์ชันใหม่: เช็คว่า Account ถูก Disable หรือไม่
// ตรวจสอบ Bit ที่ 2 ของค่า userAccountControl (ADS_UF_ACCOUNTDISABLE)
exports.isAccountDisabled = (uac) => {
    return (parseInt(uac) & 2) > 0;
};

// 7. ✅ เช็คว่า Account ถูก Lock อยู่หรือไม่ (ถ้าค่ามากกว่า 0 แสดงว่าถูกล็อก)
exports.isAccountLocked = (lockoutTime) => {
    return lockoutTime && parseInt(lockoutTime) > 0;
};