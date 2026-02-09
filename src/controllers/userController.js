const { logAction } = require("../services/logger");
const ActiveDirectory = require("activedirectory2");
const ldap = require("ldapjs");
const config = require("../config/ad");
const { validatePassword } = require("../utils/validator");

// ✅ Import Helpers
const { 
    formatDate, 
    // formatLastLogin, // ไม่ใช้ตัวนี้แล้ว เพราะเราจะคำนวณใหม่ในไฟล์นี้เลย
    isSystemAccountStrict, 
    isNonResetableAccount
} = require("../utils/adHelpers");

const { renderErrorPopup } = require("../utils/responseHelper");

// สร้าง instance ของ ActiveDirectory
const ad = new ActiveDirectory(config);

// -----------------------------------------------------------------------------
// 🛠️ Helper Function: แปลงเวลา AD (FileTime) เป็น JS Date
// -----------------------------------------------------------------------------
const adDateToJS = (adTime) => {
    if (!adTime || Number(adTime) === 0) return null;
    // สูตรแปลง Windows FileTime (100-nanosecond intervals since Jan 1, 1601 UTC)
    return new Date(Number(adTime) / 10000 - 11644473600000);
};

// -----------------------------------------------------------------------------
// 1. Dashboard & User List
// -----------------------------------------------------------------------------
exports.getDashboard = (req, res) => {
    // 🔍 1. กำหนด Attributes ที่ต้องการ (✅ เพิ่ม lastLogonTimestamp)
    const searchOptions = {
        filter: '(sAMAccountName=*)', 
        scope: 'sub',
        attributes: [
            'dn', 'cn', 'sn', 'givenName', 'description', 
            'sAMAccountName', 'userPrincipalName', 'mail', 
            'department', 'memberOf', 'whenCreated', 
            'lastLogon', 'lastLogonTimestamp', // ✅ เพิ่มตัวนี้สำคัญมาก!
            'userAccountControl', 'lockoutTime', 'objectClass'
        ]
    };

    console.log("---------------------------------------------------------------");
    console.log("📡 Connecting to AD at:", config.url);
    
    ad.find(searchOptions, (err, results) => {
        if (err) {
            console.error("❌ AD Search Error:", JSON.stringify(err));
            return res.render("index", { users: [], error: "Connect Error: " + err.message });
        }

        let foundUsers = [];
        if (results) {
            if (results.users) foundUsers = foundUsers.concat(results.users);
            if (results.other) foundUsers = foundUsers.concat(results.other);
        }

        console.log(`📥 Raw Users Found: ${foundUsers.length}`);

        let filteredUsers = [];
        if (foundUsers.length > 0) {
            // กรอง User
            filteredUsers = foundUsers.filter(u => {
                if (!u.sAMAccountName) return false;
                if (u.sAMAccountName.endsWith('$')) return false;
                if (u.sAMAccountName === 'krbtgt') return false;
                if (u.objectClass && JSON.stringify(u.objectClass).includes('computer')) return false; 
                return true; 
            });

            console.log(`✅ Filtered Users (Displaying): ${filteredUsers.length}`);

            // จัดเรียง
            filteredUsers.sort((a, b) => (a.cn || "").localeCompare(b.cn || ""));

            // ✅ จัดรูปแบบข้อมูล (Format Data)
            filteredUsers.forEach((u) => {
                u.simpleDate = formatDate(u.whenCreated);
                
                // --- 🕒 Logic ใหม่: คำนวณเวลาใช้งานล่าสุด ---
                const lastLogon = u.lastLogon ? Number(u.lastLogon) : 0;
                const lastTimestamp = u.lastLogonTimestamp ? Number(u.lastLogonTimestamp) : 0;
                
                // เลือกค่าที่ "ใหม่กว่า" (มากที่สุด)
                const bestTime = Math.max(lastLogon, lastTimestamp);
                
                u.lastLoginStr = '-'; // ค่าเริ่มต้น

                if (bestTime > 0) {
                    const dateObj = adDateToJS(bestTime);
                    if (dateObj) {
                        // แปลงเป็นรูปแบบไทย: 04.02.69 16:55
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const year = String(dateObj.getFullYear() + 543).slice(-2); // ปีไทย 2 หลัก
                        const hour = String(dateObj.getHours()).padStart(2, '0');
                        const min = String(dateObj.getMinutes()).padStart(2, '0');
                        
                        u.lastLoginStr = `${day}.${month}.${year} ${hour}:${min}`;
                    }
                }

                // --- 🛠️ Logic จัดการกลุ่ม (memberOf) ---
                let groupsList = [];
                if (u.memberOf) {
                    const rawGroups = Array.isArray(u.memberOf) ? u.memberOf : [u.memberOf];
                    groupsList = rawGroups.map(dn => {
                        const match = dn.match(/CN=([^,]+)/i);
                        return match ? match[1] : dn;
                    });
                }
                u.groupsList = groupsList; 
            });
        }
        
        // ส่ง currentUser ไปด้วยเพื่อให้ Navbar แสดงชื่อ
        res.render("index", { 
            users: filteredUsers, 
            error: null,
            currentUser: req.session.user 
        });
    });
};

// -----------------------------------------------------------------------------
// 2. Create User
// -----------------------------------------------------------------------------
exports.getCreatePage = (req, res) => {
    const ouFilter = '(objectClass=organizationalUnit)';
    console.log("🔍 Searching for OUs...");

    ad.find({ filter: ouFilter, scope: 'sub' }, (err, results) => {
        if (err) {
            console.error("❌ OU Search Error:", err);
            return res.render("create", { ous: [] });
        }

        let ous = [];
        if (results && results.other) {
            ous = results.other
                .map(item => item.dn)
                .filter(dn => {
                    if (!dn) return false;
                    const upperDN = dn.toUpperCase(); 
                    return upperDN.includes('OU=') && !upperDN.includes('OU=DOMAIN CONTROLLERS');
                })
                .sort();
        }
        res.render("create", { ous: ous });
    });
};

exports.createUser = (req, res) => {
    const { username, password, firstName, lastName, email, department, ouDN } = req.body;

    const passwordCheck = validatePassword(password, username);
    if (!passwordCheck.valid) {
        return renderErrorPopup(res, "รหัสผ่านไม่ผ่านเงื่อนไข", passwordCheck.message);
    }

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) {
            logAction(req, 'Administrator', 'Create User', username, 'FAILED', `Bind Error: ${err.message}`);
            return renderErrorPopup(res, "เชื่อมต่อ AD ไม่สำเร็จ", err.message);
        }
        
        const targetContainer = ouDN || `CN=Users,${config.baseDN}`; 
        const newUserDN = `CN=${firstName} ${lastName},${targetContainer}`;
        const adPassword = Buffer.from(`"${password}"`, 'utf16le');

        const newUser = {
            cn: `${firstName} ${lastName}`,
            sn: lastName,
            givenName: firstName,
            sAMAccountName: username,
            userPrincipalName: `${username}@ad.biccorp.com`,
            mail: email,
            department: department,
            objectClass: ["top", "person", "organizationalPerson", "user"],
            unicodePwd: adPassword,
            displayName: `${firstName} ${lastName}`,
            description: "Created via IT Admin Portal",
            userAccountControl: 512 
        };

        client.add(newUserDN, newUser, (err) => {
            client.unbind();
            if (err) {
                logAction(req, 'Administrator', 'Create User', username, 'FAILED', err.message);
                if (err.name === 'EntryAlreadyExistsError') {
                    return renderErrorPopup(res, "ชื่อซ้ำ", `User "${username}" มีอยู่แล้ว`);
                }
                return renderErrorPopup(res, "สร้าง User ไม่สำเร็จ", err.message);
            }
            
            logAction(req, 'Administrator', 'Create User', username, 'SUCCESS', `Created ${newUserDN}`);
            res.redirect("/");
        });
    });
};

// -----------------------------------------------------------------------------
// 3. Edit & Update User
// -----------------------------------------------------------------------------
exports.getEditPage = (req, res) => {
    const username = req.params.username;
    if (isSystemAccountStrict(username)) return renderErrorPopup(res, "Access Denied", "System Account");
    
    ad.findUser(username, (err, user) => {
        if (err || !user) return res.send("ไม่พบผู้ใช้งาน");
        res.render("edit", { user: user });
    });
};

exports.updateUser = (req, res) => {
    const userDN = req.body.dn;
    if (!userDN) return res.send("Error: Missing DN");
    if (isSystemAccountStrict(userDN)) return renderErrorPopup(res, "Access Denied", "System Account");

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return res.send(`Error: ${err.message}`);
        
        const changes = [
            new ldap.Change({ operation: "replace", modification: { type: 'givenName', values: [req.body.firstName] } }),
            new ldap.Change({ operation: "replace", modification: { type: 'sn', values: [req.body.lastName] } }),
            new ldap.Change({ operation: "replace", modification: { type: 'displayName', values: [`${req.body.firstName} ${req.body.lastName}`] } }),
            new ldap.Change({ operation: "replace", modification: { type: 'mail', values: [req.body.email] } }),
            new ldap.Change({ operation: "replace", modification: { type: 'department', values: [req.body.department] } }),
        ];

        client.modify(userDN, changes, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "แก้ไขไม่สำเร็จ", err.message);
            res.redirect(req.get('Referrer') || '/');
        });
    });
};

// -----------------------------------------------------------------------------
// 4. Delete User
// -----------------------------------------------------------------------------
exports.deleteUser = (req, res) => {
    const userDN = req.body.dn;
    const targetName = userDN.split(',')[0].split('=')[1] || userDN;

    if (!userDN) return res.send("Error: Missing DN");
    if (isSystemAccountStrict(userDN)) return renderErrorPopup(res, "ไม่อนุญาต", "ห้ามลบ System Account!");
    
    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return res.send(`Error: ${err.message}`);
        
        client.del(userDN, (err) => {
            client.unbind();
            if (err) {
                logAction(req, 'Administrator', 'Delete User', targetName, 'FAILED', err.message);
                return renderErrorPopup(res, "ลบไม่สำเร็จ", err.message);
            }
            logAction(req, 'Administrator', 'Delete User', targetName, 'SUCCESS', `Deleted DN: ${userDN}`);
            res.redirect("/");
        });
    });
};

// -----------------------------------------------------------------------------
// 5. Security & Status Actions
// -----------------------------------------------------------------------------
exports.toggleUserStatus = (req, res) => {
    const { dn, currentUac } = req.body;
    if (isSystemAccountStrict(dn)) return renderErrorPopup(res, "Denied", "System Account");

    const newUacValue = parseInt(currentUac) ^ 2;

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return renderErrorPopup(res, "Error", err.message);

        const change = new ldap.Change({
            operation: 'replace',
            modification: { 
                type: 'userAccountControl', 
                values: [newUacValue.toString()] 
            }
        });

        client.modify(dn, change, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "Update Failed", err.message);
            res.redirect(req.get('Referrer') || '/');
        });
    });
};

exports.unlockUser = (req, res) => {
    const { dn } = req.body;
    if (isSystemAccountStrict(dn)) return renderErrorPopup(res, "Denied", "System Account");

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return renderErrorPopup(res, "Error", err.message);

        const change = new ldap.Change({
            operation: 'replace',
            modification: { 
                type: 'lockoutTime', 
                values: ['0'] 
            }
        });

        client.modify(dn, change, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "Unlock Failed", err.message);
            res.redirect(req.get('Referrer') || '/');
        });
    });
};

exports.resetPassword = (req, res) => {
    const { dn, newPassword } = req.body;
    const targetName = dn.split(',')[0].split('=')[1] || dn;

    if (!dn || !newPassword) return res.send("Error: Missing Data");
    if (isNonResetableAccount(dn)) return renderErrorPopup(res, "Denied", "System Account");
    
    const passwordCheck = validatePassword(newPassword, null);
    if (!passwordCheck.valid) return renderErrorPopup(res, "Password Weak", passwordCheck.message);

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return res.send(`Error: ${err.message}`);
        
        const adPassword = Buffer.from(`"${newPassword}"`, 'utf16le');
        
        const changes = [
            new ldap.Change({ 
                operation: "replace", 
                modification: { 
                    type: 'unicodePwd', 
                    values: [adPassword]
                } 
            })
        ];
        
        client.modify(dn, changes, (err) => {
            client.unbind();
            if (err) {
                logAction(req, 'Administrator', 'Reset Password', targetName, 'FAILED', err.message);
                return renderErrorPopup(res, "Reset Failed", err.message);
            }
            logAction(req, 'Administrator', 'Reset Password', targetName, 'SUCCESS', 'Password changed');
            res.redirect(req.get('Referrer') || '/');
        });
    });
};