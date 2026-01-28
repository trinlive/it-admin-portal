// ----------------------------------------------------------------------------
// ฟังก์ชันสำหรับกรองข้อมูล (Filter Table) - ตัดวันที่ออกแล้ว ❌📅
// ----------------------------------------------------------------------------
function filterTable() {
    // รับค่าจาก Input (เหลือแค่ Search กับ Department)
    const searchInput = document.getElementById('searchInput');
    const deptFilter = document.getElementById('departmentFilter');

    if (!searchInput) return;

    const searchValue = searchInput.value.toLowerCase();
    const deptValue = deptFilter.value;

    const rows = document.querySelectorAll('.user-row');
    let count = 0;

    rows.forEach(row => {
        // ดึงค่าที่ซ่อนไว้ใน data-attributes
        const searchData = row.getAttribute('data-search') || '';
        const deptData = row.getAttribute('data-dept') || '';
        
        // 1. เช็คคำค้นหา (Search)
        const matchSearch = searchData.includes(searchValue);

        // 2. เช็คแผนก (Department)
        const matchDept = deptValue === '' || deptData === deptValue;

        // แสดงหรือซ่อนแถว
        if (matchSearch && matchDept) {
            row.style.display = '';
            count++;
        } else {
            row.style.display = 'none';
        }
    });

    // อัปเดตตัวเลขจำนวนรายการ
    updateCountDisplay(count);
}

// ฟังก์ชันอัปเดตตัวเลข
function updateCountDisplay(count) {
    const totalDisplay = document.getElementById('totalRecordsDisplay');
    const footerDisplay = document.getElementById('footerCount');
    
    if(totalDisplay) totalDisplay.textContent = count;
    if(footerDisplay) footerDisplay.textContent = count;
}

// ----------------------------------------------------------------------------
// ฟังก์ชันล้างค่าตัวกรอง (Clear Filter)
// ----------------------------------------------------------------------------
function clearFilter() {
    const inputs = ['searchInput', 'departmentFilter'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    filterTable(); 
}

// ----------------------------------------------------------------------------
// ฟังก์ชันยืนยันการลบ (SweetAlert2)
// ----------------------------------------------------------------------------
function confirmDelete(btn, name) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        html: `คุณกำลังจะลบผู้ใช้: <span class="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">${name}</span><br><span class="text-sm text-slate-500 mt-2 block">ข้อมูลใน Active Directory จะหายไปถาวร</span>`,
        icon: 'warning',
        showCancelButton: true,
        focusCancel: true,
        confirmButtonText: '<i class="fa-solid fa-trash-can mr-2"></i>ยืนยันลบ',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            container: 'font-sans',
            popup: 'rounded-2xl shadow-2xl border border-slate-100',
            title: 'text-xl font-bold text-slate-800',
            htmlContainer: 'text-slate-600',
            actions: 'gap-3',
            confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 px-5 rounded-lg shadow-lg hover:shadow-red-500/30 transition-all duration-200',
            cancelButton: 'bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200'
        },
        showClass: { popup: 'animate__animated animate__fadeInDown animate__faster' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp animate__faster' }
    }).then((result) => {
        if (result.isConfirmed) {
            btn.closest('form').submit();
            Swal.fire({
                title: 'กำลังลบข้อมูล...',
                html: 'กรุณารอสักครู่ ระบบกำลังติดต่อ AD Server',
                timerProgressBar: true,
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { popup: 'rounded-2xl shadow-xl font-sans' }
            });
        }
    });
}

// ----------------------------------------------------------------------------
// ✅ ฟังก์ชันสลับการแสดงรหัสผ่านใน Popup (Show/Hide Password)
// ----------------------------------------------------------------------------
function toggleSwalPassword() {
    const passwordInput = document.getElementById('swalPasswordInput');
    const eyeIcon = document.getElementById('swalEyeIcon');

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

// ----------------------------------------------------------------------------
// ✅ ฟังก์ชัน Popup รีเซ็ตรหัสผ่าน (Reset Password) 🔑 (แบบมีปุ่มลูกตา)
// ----------------------------------------------------------------------------
async function promptResetPassword(dn, username) {
    const { value: newPassword } = await Swal.fire({
        title: '<i class="fa-solid fa-key text-yellow-500 mr-2"></i>รีเซ็ตรหัสผ่านใหม่',
        html: `
            <div class="text-left font-sans">
                <p class="mb-4 text-center text-slate-600">
                    เปลี่ยนรหัสให้ User: <span class="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">${username}</span>
                </p>
                
                <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-slate-700 shadow-sm mb-4">
                    <p class="font-bold text-orange-700 mb-2 flex items-center text-xs uppercase tracking-wide">
                        <i class="fa-solid fa-shield-halved mr-1.5"></i> ข้อกำหนดรหัสผ่าน:
                    </p>
                    <ul class="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                        <li>ยาวอย่างน้อย <span class="font-bold text-red-500">8 ตัวอักษร</span></li>
                        <li>ต้องมี A-Z, a-z และ 0-9 ผสมกัน</li>
                        <li>ห้ามใช้ชื่อ User</li>
                    </ul>
                </div>

                <div class="relative">
                    <input type="password" id="swalPasswordInput" 
                        class="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition text-center text-lg tracking-widest font-medium text-slate-700" 
                        placeholder="P@ssw0rd1234">
                    
                    <button type="button" onclick="toggleSwalPassword()" 
                        class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition outline-none cursor-pointer" 
                        style="z-index: 10;">
                        <i class="fa-regular fa-eye" id="swalEyeIcon"></i>
                    </button>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-save mr-2"></i>บันทึกรหัสผ่าน',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            container: 'font-sans',
            popup: 'rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md',
            title: 'text-xl font-bold text-slate-800 pt-6',
            htmlContainer: 'text-slate-600',
            confirmButton: 'bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2.5 px-5 rounded-lg shadow-lg hover:shadow-yellow-500/30 transition-all ml-2',
            cancelButton: 'bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all'
        },
        // ดักจับ Event ตอนเปิด Popup
        didOpen: () => {
            const input = document.getElementById('swalPasswordInput');
            if(input) {
                input.focus();
                // กด Enter เพื่อ Submit
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') Swal.clickConfirm();
                });
            }
        },
        // ดึงค่าและตรวจสอบก่อนปิด Popup
        preConfirm: () => {
            const password = document.getElementById('swalPasswordInput').value;
            if (!password || password.length < 8) {
                Swal.showValidationMessage('กรุณากรอกรหัสผ่านอย่างน้อย 8 ตัวอักษร');
                return false;
            }
            return password;
        }
    });

    if (newPassword) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/users/reset-password';

        const inputDN = document.createElement('input');
        inputDN.type = 'hidden';
        inputDN.name = 'dn';
        inputDN.value = dn;

        const inputPass = document.createElement('input');
        inputPass.type = 'hidden';
        inputPass.name = 'newPassword';
        inputPass.value = newPassword;

        form.appendChild(inputDN);
        form.appendChild(inputPass);
        document.body.appendChild(form);

        Swal.fire({
            title: 'กำลังบันทึก...',
            html: 'กรุณารอสักครู่ ระบบกำลังติดต่อ AD Server',
            timerProgressBar: true,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { popup: 'rounded-2xl shadow-xl font-sans' }
        });

        form.submit();
    }
}