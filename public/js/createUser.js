/**
 * ฟังก์ชันสลับการแสดงผลรหัสผ่าน (ซ่อน/แสดง)
 */
function togglePassword() {
    const passwordInput = document.getElementById('passwordInput');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

/**
 * ฟังก์ชันตรวจสอบความปลอดภัยรหัสผ่าน (Validation)
 */
function checkPassword() {
    const password = document.getElementById('passwordInput').value;
    const username = document.getElementById('usernameInput').value.toLowerCase();
    const submitBtn = document.getElementById('submitBtn');
    
    // Elements แสดงผลสถานะ
    const reqLength = document.getElementById('req-length');
    const reqComplex = document.getElementById('req-complex');
    const reqUser = document.getElementById('req-user');

    // 1. ตรวจความยาว (8 ตัวอักษรขึ้นไป)
    const isLengthValid = password.length >= 8;
    updateStatus(reqLength, isLengthValid);

    // 2. ตรวจความซับซ้อน (ตัวใหญ่, เล็ก, เลข หรือ อักขระพิเศษ)
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    const isComplexValid = (hasUpper && hasLower && (hasNumber || hasSpecial));
    updateStatus(reqComplex, isComplexValid);

    // 3. ตรวจสอบว่าไม่มีชื่อ user ในรหัสผ่าน
    let isUserValid = true;
    if (username.length > 2 && password.toLowerCase().includes(username)) {
        isUserValid = false;
    }
    // ถ้ายังไม่ได้พิมพ์รหัส ให้ถือว่าผ่านไปก่อน (เพื่อไม่ให้ขึ้นแดงทันที)
    if(password.length === 0) isUserValid = true;

    if (!isUserValid) {
        reqUser.className = 'flex items-start gap-2 error-req transition-colors duration-300';
    } else if (password.length > 0) {
        reqUser.className = 'flex items-start gap-2 valid-req transition-colors duration-300';
    } else {
        reqUser.className = 'flex items-start gap-2 invalid-req transition-colors duration-300';
    }

    // เปิด/ปิด ปุ่ม Submit
    if (isLengthValid && isComplexValid && isUserValid) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('bg-slate-400', 'cursor-not-allowed');
        submitBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'hover:-translate-y-0.5');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.add('bg-slate-400', 'cursor-not-allowed');
        submitBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700', 'hover:-translate-y-0.5');
    }
}

/**
 * Helper เปลี่ยนสี icon สถานะ
 */
function updateStatus(element, isValid) {
    if (isValid) {
        element.className = 'flex items-start gap-2 valid-req transition-colors duration-300';
    } else {
        element.className = 'flex items-start gap-2 invalid-req transition-colors duration-300';
    }
}

/**
 * ✅ ฟังก์ชันสุ่มรหัสผ่านอัตโนมัติ (Generate Password)
 */
function generatePassword() {
    const length = 12;
    // ตัดตัวที่สับสนง่ายออก เช่น l, 1, I, O, 0
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghijkmnpqrstuvwxyz";
    const numbers = "23456789";
    const specials = "!@#$%^&*";
    
    const allChars = uppers + lowers + numbers + specials;
    let password = "";

    // บังคับให้มีอย่างน้อย 1 ตัวจากแต่ละกลุ่ม
    password += uppers.charAt(Math.floor(Math.random() * uppers.length));
    password += lowers.charAt(Math.floor(Math.random() * lowers.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += specials.charAt(Math.floor(Math.random() * specials.length));

    // สุ่มส่วนที่เหลือ
    for (let i = 0; i < length - 4; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Shuffle ตัวอักษร
    password = password.split('').sort(() => 0.5 - Math.random()).join('');

    // ใส่ค่าลง Input และ Validate ทันที
    const passwordInput = document.getElementById('passwordInput');
    passwordInput.value = password;
    
    // เปิดตาให้เห็นรหัส
    passwordInput.type = 'text';
    const eyeIcon = document.getElementById('eyeIcon');
    if (eyeIcon) {
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    }

    // เรียกตรวจสอบเงื่อนไขเพื่อให้ปุ่ม Submit ทำงาน
    checkPassword();
}