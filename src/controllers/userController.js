const ActiveDirectory = require("activedirectory2");
const ldap = require("ldapjs");
const config = require("../config/ad");
const { validatePassword } = require("../utils/validator");

const ad = new ActiveDirectory(config);

// --- Helper Functions ---

// 1. แปลงวันที่สร้าง (whenCreated) เป็น YYYY-MM-DD
const formatDate = (dateInput) => {
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
const formatLastLogin = (timestamp) => {
    if (!timestamp || Number(timestamp) === 0) return "-";
    
    // สูตรคำนวณ Windows File Time (100-nanosecond intervals since 1601)
    const lastLogonDate = new Date(timestamp / 10000 - 11644473600000);
    
    // ป้องกันกรณีวันที่เพี้ยน (เช่น ปี 1601 หรือก่อน 1970)
    if (lastLogonDate.getFullYear() < 1970) return "-";

    const dd = String(lastLogonDate.getDate()).padStart(2, '0');
    const mm = String(lastLogonDate.getMonth() + 1).padStart(2, '0');
    const yy = String(lastLogonDate.getFullYear()).slice(-2);
    const HH = String(lastLogonDate.getHours()).padStart(2, '0');
    const min = String(lastLogonDate.getMinutes()).padStart(2, '0');
    
    return `${dd}.${mm}.${yy} ${HH}:${min}`;
};

// 3. ✅ แปลง memberOf (CN=Group,...) ให้เป็นชื่อ Group สวยๆ
const formatGroups = (memberOf) => {
    if (!memberOf) return [];
    
    // ถ้ามีกลุ่มเดียว AD จะส่งมาเป็น String, ถ้ามีหลายกลุ่มจะเป็น Array
    const groups = Array.isArray(memberOf) ? memberOf : [memberOf];
    
    return groups.map(g => {
        // ใช้ Regex ดึงค่าหลัง CN= จนถึงตัวลูกน้ำตัวแรก
        const match = g.match(/^CN=([^,]+)/);
        return match ? match[1] : g;
    });
};

// 4. ฟังก์ชันสร้างหน้า HTML Popup แจ้งเตือน Error (ใช้ SweetAlert2)
const renderErrorPopup = (res, title, message, technicalError = "") => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style> body { font-family: 'Sarabun', sans-serif; background-color: #f8fafc; } </style>
    </head>
    <body>
        <script>
            Swal.fire({
                icon: 'error',
                title: '${title}',
                html: '${message} <br><br> <span style="color:gray; font-size:0.8em;">${technicalError}</span>',
                confirmButtonText: '<i class="fa-solid fa-arrow-left"></i> กลับไป',
                confirmButtonColor: '#059669',
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    window.history.back(); 
                }
            });
        </script>
    </body>
    </html>
    `;
    res.send(htmlContent);
};

// 🔒 Helper 5: เช็ค Account ที่ห้ามแก้ไข/ห้ามลบ (Strict)
// (รวม Administrator ด้วย เพราะเราไม่อยากให้ใครลบ Admin หรือแก้ชื่อ Admin เล่น)
const isSystemAccountStrict = (identifier) => {
    if (!identifier) return false;
    const lowerId = identifier.toLowerCase();
    return lowerId.includes("cn=administrator") || lowerId === "administrator" ||
           lowerId.includes("cn=guest") || lowerId === "guest" ||
           lowerId.includes("cn=krbtgt") || lowerId === "krbtgt";
};

// 🔓 Helper 6: เช็ค Account ที่ห้าม Reset Password
// (ไม่รวม Administrator -> แปลว่า Admin รีเซ็ตรหัสได้)
const isNonResetableAccount = (identifier) => {
    if (!identifier) return false;
    const lowerId = identifier.toLowerCase();
    // ตัด Administrator ออกจากลิสต์นี้
    return lowerId.includes("cn=guest") || lowerId === "guest" ||
           lowerId.includes("cn=krbtgt") || lowerId === "krbtgt";
};


// --- Controllers ---

exports.getDashboard = (req, res) => {
    const query = "(&(objectClass=user)(objectCategory=person))";
    ad.findUsers(query, (err, users) => {
        if (err) {
            console.error("ERROR:", JSON.stringify(err));
            return res.render("index", { users: [], error: err.message });
        }
        if (users) {
            users.sort((a, b) => (a.cn || "").localeCompare(b.cn || ""));
            users.forEach((u) => {
                u.simpleDate = formatDate(u.whenCreated);
                u.lastLoginStr = formatLastLogin(u.lastLogon); // ใช้ lastLogon (Real-time)
                u.groupsList = formatGroups(u.memberOf); // ✅ แปลง Group
            });
        }
        res.render("index", { users: users, error: null });
    });
};

exports.getCreatePage = (req, res) => {
    res.render("create");
};

exports.createUser = (req, res) => {
    // 1. ตรวจสอบ Password
    const passwordCheck = validatePassword(req.body.password, req.body.username);
    if (!passwordCheck.valid) {
        return renderErrorPopup(res, "รหัสผ่านไม่ผ่านเงื่อนไข", passwordCheck.message);
    }

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return renderErrorPopup(res, "เชื่อมต่อ AD ไม่สำเร็จ", "ไม่สามารถติดต่อ Server ได้", err.message);
        
        const newUserDN = `CN=${req.body.firstName} ${req.body.lastName},CN=Users,${config.baseDN}`;
        const newUser = {
            cn: `${req.body.firstName} ${req.body.lastName}`,
            sn: req.body.lastName,
            givenName: req.body.firstName,
            sAMAccountName: req.body.username,
            userPrincipalName: `${req.body.username}@biccorp.com`,
            mail: req.body.email,
            department: req.body.department,
            objectClass: ["top", "person", "organizationalPerson", "user"],
            userPassword: req.body.password,
            displayName: `${req.body.firstName} ${req.body.lastName}`,
            description: "Created via IT Admin Portal",
            userAccountControl: 512 // Enable Account
        };

        client.add(newUserDN, newUser, (err) => {
            client.unbind();
            
            if (err) {
                console.error("Create Error:", err);
                
                // ดักจับ Error ชื่อซ้ำ
                if (err.message.includes("already in use") || err.name === 'EntryAlreadyExistsError') {
                    return renderErrorPopup(
                        res, 
                        "ชื่อ Username ซ้ำ!", 
                        `ชื่อผู้ใช้ <b>"${req.body.username}"</b> มีอยู่ในระบบแล้ว<br>กรุณาเปลี่ยนชื่อใหม่`, 
                        "(Error: Entry Already Exists)"
                    );
                }

                return renderErrorPopup(res, "สร้าง User ไม่สำเร็จ", "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ", err.message);
            }
            
            res.redirect("/");
        });
    });
};

exports.deleteUser = (req, res) => {
    const userDN = req.body.dn;
    if (!userDN) return res.send("Error: Missing DN");

    // 🔒 ใช้ Strict Check (รวม Admin): ห้ามลบเด็ดขาด
    if (isSystemAccountStrict(userDN)) {
        return renderErrorPopup(res, "การกระทำถูกปฏิเสธ", "บัญชีนี้เป็น System Account ห้ามลบเด็ดขาด!");
    }
    
    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return res.send(`Error connecting to AD: ${err.message}`);
        client.del(userDN, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "ลบไม่สำเร็จ", "ไม่สามารถลบผู้ใช้งานได้", err.message);
            res.redirect("/");
        });
    });
};

exports.getEditPage = (req, res) => {
    const username = req.params.username;

    // 🔒 ใช้ Strict Check (รวม Admin): ห้ามแก้ไขข้อมูลส่วนตัว
    if (isSystemAccountStrict(username)) {
         return renderErrorPopup(res, "Access Denied", "ไม่อนุญาตให้แก้ไขข้อมูล System Account");
    }

    ad.findUser(username, (err, user) => {
        if (err || !user) return res.send("ไม่พบผู้ใช้งาน หรือเกิดข้อผิดพลาด");
        res.render("edit", { user: user });
    });
};

exports.updateUser = (req, res) => {
    const userDN = req.body.dn;
    if (!userDN) return res.send("Error: Missing DN");
    
    // 🔒 ใช้ Strict Check (รวม Admin): ห้ามแก้ไขข้อมูลส่วนตัว
    if (isSystemAccountStrict(userDN)) {
        return renderErrorPopup(res, "Access Denied", "ไม่อนุญาตให้แก้ไขข้อมูล System Account");
   }

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return res.send(`Error connecting to AD: ${err.message}`);
        const changes = [
            new ldap.Change({ operation: "replace", modification: { givenName: req.body.firstName } }),
            new ldap.Change({ operation: "replace", modification: { sn: req.body.lastName } }),
            new ldap.Change({ operation: "replace", modification: { displayName: `${req.body.firstName} ${req.body.lastName}` } }),
            new ldap.Change({ operation: "replace", modification: { mail: req.body.email } }),
            new ldap.Change({ operation: "replace", modification: { department: req.body.department } }),
        ];
        client.modify(userDN, changes, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "แก้ไขไม่สำเร็จ", "เกิดข้อผิดพลาดในการอัปเดตข้อมูล", err.message);
            res.redirect("/");
        });
    });
};

exports.resetPassword = (req, res) => {
    const userDN = req.body.dn;
    const newPassword = req.body.newPassword;
    if (!userDN || !newPassword) return res.send("Error: Missing Data");
    
    // 🔓 ใช้ Helper ใหม่ (ไม่รวม Admin): ยอมให้ Admin รีเซ็ตรหัสผ่านได้
    if (isNonResetableAccount(userDN)) {
        return renderErrorPopup(res, "Access Denied", "ไม่อนุญาตให้รีเซ็ตรหัสผ่านของ System Account นี้");
    }
    
    const passwordCheck = validatePassword(newPassword, null);
    if (!passwordCheck.valid) return renderErrorPopup(res, "รหัสผ่านไม่ผ่านเงื่อนไข", passwordCheck.message);

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return res.send(`Error connecting to AD: ${err.message}`);
        const changes = [new ldap.Change({ operation: "replace", modification: { userPassword: newPassword } })];
        client.modify(userDN, changes, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "เปลี่ยนรหัสไม่สำเร็จ", "อาจเกิดจาก Policy ของ AD หรือสิทธิ์ไม่เพียงพอ", err.message);
            res.redirect("/");
        });
    });
};