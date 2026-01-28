// ฟังก์ชันตรวจสอบความแข็งแกร่งของรหัสผ่าน
const validatePassword = (password, username) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let complexityCount = 0;
    if (hasUpper) complexityCount++;
    if (hasLower) complexityCount++;
    if (hasNumber) complexityCount++;
    if (hasSpecial) complexityCount++;

    if (password.length < minLength) {
        return { valid: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร' };
    }
    
    if (complexityCount < 3) {
        return { valid: false, message: 'รหัสผ่านต้องซับซ้อนกว่านี้ (ต้องมี ตัวใหญ่, ตัวเล็ก, ตัวเลข หรืออักขระพิเศษ ผสมกัน)' };
    }

    if (username && password.toLowerCase().includes(username.toLowerCase())) {
        return { valid: false, message: 'รหัสผ่านห้ามมีชื่อ Username เป็นส่วนประกอบ' };
    }

    return { valid: true };
};

module.exports = { validatePassword };