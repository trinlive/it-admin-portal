// src/controllers/userController.js
const ActiveDirectory = require("activedirectory2");
const ldap = require("ldapjs");
const config = require("../config/ad");
const { validatePassword } = require("../utils/validator");

// Import Helpers ที่แยกออกไป
const { 
    formatDate, 
    formatLastLogin, 
    formatGroups, 
    isSystemAccountStrict, 
    isNonResetableAccount 
} = require("../utils/adHelpers");

const { renderErrorPopup } = require("../utils/responseHelper");

const ad = new ActiveDirectory(config);

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
                u.lastLoginStr = formatLastLogin(u.lastLogon);
                u.groupsList = formatGroups(u.memberOf);
            });
        }
        res.render("index", { users: users, error: null });
    });
};

exports.getCreatePage = (req, res) => {
    res.render("create");
};

exports.createUser = (req, res) => {
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
            userAccountControl: 512
        };

        client.add(newUserDN, newUser, (err) => {
            client.unbind();
            if (err) {
                console.error("Create Error:", err);
                if (err.message.includes("already in use") || err.name === 'EntryAlreadyExistsError') {
                    return renderErrorPopup(res, "ชื่อ Username ซ้ำ!", `ชื่อผู้ใช้ <b>"${req.body.username}"</b> มีอยู่ในระบบแล้ว`, "(Error: Entry Already Exists)");
                }
                return renderErrorPopup(res, "สร้าง User ไม่สำเร็จ", "เกิดข้อผิดพลาด", err.message);
            }
            res.redirect("/");
        });
    });
};

exports.deleteUser = (req, res) => {
    const userDN = req.body.dn;
    if (!userDN) return res.send("Error: Missing DN");

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