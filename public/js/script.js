// ----------------------------------------------------------------------------
// ฟังก์ชันสำหรับกรองข้อมูลในตาราง (Real-time Filter)
// ----------------------------------------------------------------------------
function filterTable() {
    const searchInput = document.getElementById('searchInput');
    const deptFilter = document.getElementById('departmentFilter');

    if (!searchInput) return;

    const searchValue = searchInput.value.toLowerCase();
    const deptValue = deptFilter.value;

    const rows = document.querySelectorAll('.user-row');
    let count = 0;

    rows.forEach(row => {
        const searchData = row.getAttribute('data-search') || '';
        const deptData = row.getAttribute('data-dept') || '';
        
        const matchSearch = searchData.includes(searchValue);
        const matchDept = deptValue === '' || deptData === deptValue;

        if (matchSearch && matchDept) {
            row.style.display = '';
            count++;
        } else {
            row.style.display = 'none';
        }
    });

    updateCountDisplay(count);
}

// อัปเดตตัวเลขแสดงจำนวนรายการในหน้าเว็บ
function updateCountDisplay(count) {
    const totalDisplay = document.getElementById('totalRecordsDisplay');
    const footerDisplay = document.getElementById('footerCount');
    
    if(totalDisplay) totalDisplay.textContent = count;
    if(footerDisplay) footerDisplay.textContent = count;
}

// ล้างค่าตัวกรองทั้งหมด
function clearFilter() {
    const inputs = ['searchInput', 'departmentFilter'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    filterTable(); 
}

// ----------------------------------------------------------------------------
// ฟังก์ชันยืนยันการลบผู้ใช้ (Confirm Delete)
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
        }
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
// ✅ ฟังก์ชันใหม่: ยืนยันการเปิด/ปิดบัญชี (Toggle Enable/Disable Status)
// ----------------------------------------------------------------------------
function confirmToggleStatus(dn, username, currentUac, isDisabled) {
    const actionText = isDisabled ? 'เปิดใช้งาน (Enable)' : 'ปิดใช้งาน (Disable)';
    const color = isDisabled ? '#059669' : '#ef4444';

    Swal.fire({
        title: `${actionText} บัญชีนี้?`,
        html: `คุณต้องการเปลี่ยนสถานะของ <b>${username}</b> หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: color,
        confirmButtonText: `ยืนยัน ${actionText}`,
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            container: 'font-sans',
            popup: 'rounded-2xl shadow-2xl border border-slate-100',
            title: 'text-xl font-bold text-slate-800',
            htmlContainer: 'text-slate-600',
            actions: 'gap-3',
            confirmButton: `${isDisabled ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'} text-white font-medium py-2.5 px-5 rounded-lg shadow-lg transition-all duration-200`,
            cancelButton: 'bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/users/toggle-status';
            
            const inputDn = document.createElement('input');
            inputDn.type = 'hidden'; inputDn.name = 'dn'; inputDn.value = dn;
            
            const inputUac = document.createElement('input');
            inputUac.type = 'hidden'; inputUac.name = 'currentUac'; inputUac.value = currentUac;

            form.appendChild(inputDn);
            form.appendChild(inputUac);
            document.body.appendChild(form);

            Swal.fire({
                title: 'กำลังดำเนินการ...',
                html: 'กรุณารอสักครู่ ระบบกำลังติดต่อ AD Server',
                timerProgressBar: true,
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { popup: 'rounded-2xl shadow-xl font-sans' }
            });

            form.submit();
        }
    });
}

// ----------------------------------------------------------------------------
// ฟังก์ชันสลับการแสดงรหัสผ่านใน Popup
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
// ฟังก์ชัน Popup รีเซ็ตรหัสผ่าน (Reset Password)
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
                        placeholder="ตั้งรหัสผ่านใหม่...">
                    
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
        didOpen: () => {
            const input = document.getElementById('swalPasswordInput');
            if(input) {
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') Swal.clickConfirm();
                });
            }
        },
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
        inputDN.type = 'hidden'; inputDN.name = 'dn'; inputDN.value = dn;

        const inputPass = document.createElement('input');
        inputPass.type = 'hidden'; inputPass.name = 'newPassword'; inputPass.value = newPassword;

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