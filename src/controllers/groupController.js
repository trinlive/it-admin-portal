const ActiveDirectory = require("activedirectory2");
const ldap = require("ldapjs"); // ✅ ต้องเพิ่มบรรทัดนี้เพื่อใช้สั่งแก้ข้อมูล
const config = require("../config/ad");
const { renderErrorPopup } = require("../utils/responseHelper");

const ad = new ActiveDirectory(config);

// 1. หน้าจัดการกลุ่ม (ใช้ ad เหมือนเดิม เพราะเป็นการอ่านข้อมูล)
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

// 2. เพิ่ม User เข้า Group (✅ แก้มาใช้ ldapjs modify)
exports.addUserToGroup = (req, res) => {
    const { userDN, groupDN } = req.body;
    
    // สร้าง Client ใหม่เพื่อทำการแก้ไข
    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return renderErrorPopup(res, "เชื่อมต่อ AD ไม่สำเร็จ", err.message);

        // คำสั่ง Add Attribute 'member'
        const change = new ldap.Change({
            operation: 'add',
            modification: {
                member: userDN
            }
        });

        client.modify(groupDN, change, (err) => {
            client.unbind(); // ปิด Connection เสมอ
            
            if (err) {
                console.error("Add Group Error:", err);
                // ดัก Error กรณี User อยู่ในกลุ่มแล้ว
                if (err.code === 68 || err.message.includes('Already Exists')) {
                    return renderErrorPopup(res, "แจ้งเตือน", "User รายนี้อยู่ในกลุ่มดังกล่าวอยู่แล้ว");
                }
                return renderErrorPopup(res, "เพิ่มเข้ากลุ่มไม่สำเร็จ", "อาจติด Permission หรือข้อผิดพลาดอื่น", err.message);
            }
            
            res.redirect('back'); // สำเร็จ! รีเฟรชหน้าเดิม
        });
    });
};

// 3. ลบ User ออกจาก Group (✅ แก้มาใช้ ldapjs modify)
exports.removeUserFromGroup = (req, res) => {
    const { userDN, groupDN } = req.body;

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return renderErrorPopup(res, "เชื่อมต่อ AD ไม่สำเร็จ", err.message);

        // คำสั่ง Delete Attribute 'member'
        const change = new ldap.Change({
            operation: 'delete',
            modification: {
                member: userDN
            }
        });

        client.modify(groupDN, change, (err) => {
            client.unbind();

            if (err) {
                console.error("Remove Group Error:", err);
                // ดัก Error กรณีหา User ในกลุ่มไม่เจอ (UNWILLING_TO_PERFORM เป็นต้น)
                return renderErrorPopup(res, "นำออกจากกลุ่มไม่สำเร็จ", "เกิดข้อผิดพลาดในการลบ", err.message);
            }
            
            res.redirect('back');
        });
    });
};