// src/controllers/groupController.js
const ActiveDirectory = require("activedirectory2");
const config = require("../config/ad");
const { renderErrorPopup } = require("../utils/responseHelper");

const ad = new ActiveDirectory(config);

// 1. หน้าจัดการกลุ่ม
exports.getManageGroupsPage = (req, res) => {
    const username = req.params.username;

    ad.findUser(username, (err, user) => {
        if (err || !user) return renderErrorPopup(res, "ไม่พบผู้ใช้งาน", "User Not Found");

        ad.findGroups('cn=*', (err, allGroups) => {
            if (err) return renderErrorPopup(res, "ดึงข้อมูล Group ไม่สำเร็จ", err.message);

            if (allGroups) {
                allGroups.sort((a, b) => (a.cn || "").localeCompare(b.cn || ""));
            }

            let currentUserGroups = [];
            if (user.memberOf) {
                currentUserGroups = Array.isArray(user.memberOf) ? user.memberOf : [user.memberOf];
            }

            res.render('manage_groups', { 
                user: user, 
                userGroups: currentUserGroups,
                allGroups: allGroups
            });
        });
    });
};

// 2. เพิ่ม User เข้า Group
exports.addUserToGroup = (req, res) => {
    const { userDN, groupDN } = req.body;
    
    ad.addUserToGroup(groupDN, userDN, (err) => {
        if (err) {
            console.error(err);
            return renderErrorPopup(res, "เพิ่มเข้ากลุ่มไม่สำเร็จ", "อาจติด Permission หรือ User อยู่ในกลุ่มแล้ว", err.message);
        }
        res.redirect('back');
    });
};

// 3. ลบ User ออกจาก Group
exports.removeUserFromGroup = (req, res) => {
    const { userDN, groupDN } = req.body;

    ad.removeUserFromGroup(groupDN, userDN, (err) => {
        if (err) {
            console.error(err);
            return renderErrorPopup(res, "นำออกจากกลุ่มไม่สำเร็จ", "เกิดข้อผิดพลาด", err.message);
        }
        res.redirect('back');
    });
};