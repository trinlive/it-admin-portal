const ActiveDirectory = require("activedirectory2");
const ldap = require("ldapjs");
const config = require("../config/ad");
const { validatePassword } = require("../utils/validator");

// ✅ Import Helpers
const { 
    formatDate, 
    formatLastLogin, 
    formatGroups, 
    isSystemAccountStrict, 
    isNonResetableAccount
} = require("../utils/adHelpers");

const { renderErrorPopup } = require("../utils/responseHelper");

// สร้าง instance ของ ActiveDirectory
const ad = new ActiveDirectory(config);

// -----------------------------------------------------------------------------
// 1. Dashboard & User List (Unlimited Attributes & Safe Search)
// -----------------------------------------------------------------------------
exports.getDashboard = (req, res) => {
    // 🔍 1. กำหนด Search Query (ดึงทุก Attribute เพื่อความชัวร์)
    const searchOptions = {
        filter: '(sAMAccountName=*)', 
        scope: 'sub',                 // ค้นหาทั้ง Subtree
        // ❌ ไม่จำกัด attributes แล้ว เพื่อให้ได้ข้อมูลครบถ้วนที่สุด
        // attributes: config.attributes.user 
    };

    console.log("---------------------------------------------------------------");
    console.log("📡 Connecting to AD at:", config.url);
    
    // 🔍 2. ค้นหาแบบ Deep Search
    ad.find(searchOptions, (err, results) => {
        if (err) {
            console.error("❌ AD Search Error:", JSON.stringify(err));
            return res.render("index", { users: [], error: "Connect Error: " + err.message });
        }

        // 🔍 3. รวมผลลัพธ์
        let foundUsers = [];
        if (results) {
            if (results.users) foundUsers = foundUsers.concat(results.users);
            if (results.other) foundUsers = foundUsers.concat(results.other);
        }

        console.log(`📥 Raw Users Found: ${foundUsers.length}`);

        // Debug: ปริ้นท์รายชื่อคนที่หาเจอ
        if(foundUsers.length > 0) {
            const names = foundUsers.map(u => u.sAMAccountName).join(", ");
            console.log("📋 Found Users List:", names);
        }

        let filteredUsers = [];
        if (foundUsers.length > 0) {
            // ✅ 4. กรองข้อมูล (Safe Filter)
            filteredUsers = foundUsers.filter(u => {
                // ต้องมีชื่อ Account
                if (!u.sAMAccountName) return false;
                
                // ตัดบัญชีคอมพิวเตอร์ (ลงท้ายด้วย $)
                if (u.sAMAccountName.endsWith('$')) return false;
                
                // ตัดบัญชีระบบเฉพาะ
                if (u.sAMAccountName === 'krbtgt') return false;
                
                // Safe Check: เช็ค objectClass (ถ้ามี)
                if (u.objectClass) {
                    const objClassStr = JSON.stringify(u.objectClass);
                    if (objClassStr.includes('computer')) return false; 
                }
                
                return true; 
            });

            console.log(`✅ Filtered Users (Displaying): ${filteredUsers.length}`);

            // จัดเรียงตามชื่อ
            filteredUsers.sort((a, b) => (a.cn || "").localeCompare(b.cn || ""));

            // จัดรูปแบบวันที่และกลุ่ม
            filteredUsers.forEach((u) => {
                u.simpleDate = formatDate(u.whenCreated);
                u.lastLoginStr = formatLastLogin(u.lastLogon);
                // ✅ Safe Check: ถ้าไม่มีกลุ่ม ให้ใส่ Array ว่าง (กัน Error)
                u.groupsList = formatGroups(u.memberOf || []); 
            });
        }
        
        res.render("index", { users: filteredUsers, error: null });
    });
};

// -----------------------------------------------------------------------------
// 2. Create User
// -----------------------------------------------------------------------------
exports.getCreatePage = (req, res) => {
    const ouFilter = '(objectClass=organizationalUnit)';
    // ใช้ ad.find เพื่อดึง OU ทั้งหมด
    ad.find({ filter: ouFilter, scope: 'sub' }, (err, results) => {
        let ous = [];
        if (results && results.other) {
            ous = results.other
                .map(item => item.dn)
                .filter(dn => dn.indexOf('OU=') !== -1)
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
        if (err) return renderErrorPopup(res, "เชื่อมต่อ AD ไม่สำเร็จ", err.message);
        
        // กำหนดตำแหน่ง (DN)
        const targetContainer = ouDN || `CN=Users,${config.baseDN}`; 
        const newUserDN = `CN=${firstName} ${lastName},${targetContainer}`;
        
        // แปลงรหัสผ่านเป็น UTF-16LE ("password")
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
            userAccountControl: 512 // Enable Account
        };

        client.add(newUserDN, newUser, (err) => {
            client.unbind();
            if (err) {
                if (err.name === 'EntryAlreadyExistsError') {
                    return renderErrorPopup(res, "ชื่อซ้ำ", `User "${username}" มีอยู่แล้ว`);
                }
                return renderErrorPopup(res, "สร้าง User ไม่สำเร็จ", err.message);
            }
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
            new ldap.Change({ operation: "replace", modification: { givenName: req.body.firstName } }),
            new ldap.Change({ operation: "replace", modification: { sn: req.body.lastName } }),
            new ldap.Change({ operation: "replace", modification: { displayName: `${req.body.firstName} ${req.body.lastName}` } }),
            new ldap.Change({ operation: "replace", modification: { mail: req.body.email } }),
            new ldap.Change({ operation: "replace", modification: { department: req.body.department } }),
        ];

        client.modify(userDN, changes, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "แก้ไขไม่สำเร็จ", err.message);
            res.redirect("/");
        });
    });
};

// -----------------------------------------------------------------------------
// 4. Delete User
// -----------------------------------------------------------------------------
exports.deleteUser = (req, res) => {
    const userDN = req.body.dn;
    if (!userDN) return res.send("Error: Missing DN");
    if (isSystemAccountStrict(userDN)) return renderErrorPopup(res, "ไม่อนุญาต", "ห้ามลบ System Account!");
    
    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return res.send(`Error: ${err.message}`);
        client.del(userDN, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "ลบไม่สำเร็จ", err.message);
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
            modification: { userAccountControl: newUacValue.toString() }
        });

        client.modify(dn, change, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "Update Failed", err.message);
            res.redirect("/");
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
            modification: { lockoutTime: '0' }
        });

        client.modify(dn, change, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "Unlock Failed", err.message);
            res.redirect("/");
        });
    });
};

exports.resetPassword = (req, res) => {
    const { dn, newPassword } = req.body;
    if (!dn || !newPassword) return res.send("Error: Missing Data");
    if (isNonResetableAccount(dn)) return renderErrorPopup(res, "Denied", "System Account");
    
    const passwordCheck = validatePassword(newPassword, null);
    if (!passwordCheck.valid) return renderErrorPopup(res, "Password Weak", passwordCheck.message);

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return res.send(`Error: ${err.message}`);
        
        const adPassword = Buffer.from(`"${newPassword}"`, 'utf16le');
        const changes = [new ldap.Change({ operation: "replace", modification: { unicodePwd: adPassword } })];
        
        client.modify(dn, changes, (err) => {
            client.unbind();
            if (err) return renderErrorPopup(res, "Reset Failed", err.message);
            res.redirect("/");
        });
    });
};