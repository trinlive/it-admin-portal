const ActiveDirectory = require("activedirectory2");
const ldap = require("ldapjs"); 
const config = require("../config/ad");
const { renderErrorPopup } = require("../utils/responseHelper");

const ad = new ActiveDirectory(config);

// -----------------------------------------------------------------------------
// 1. หน้าจัดการกลุ่ม (View Group Management Page)
// -----------------------------------------------------------------------------
// src/controllers/groupController.js

// 1. หน้าจัดการกลุ่ม (View Group Management Page)
exports.getManageGroupsPage = (req, res) => {
    const username = req.params.username;

    console.log(`🔍 Fetching groups for user: ${username}`);

    // ✅ เปลี่ยนวิธีค้นหา: ระบุ Attribute ที่ต้องการให้ชัดเจน (รวมถึง memberOf)
    const searchOptions = {
        filter: `(sAMAccountName=${username})`,
        scope: 'sub',
        attributes: ['dn', 'cn', 'sAMAccountName', 'memberOf', 'primaryGroupID'] // ระบุขอ memberOf ตรงนี้
    };

    ad.find(searchOptions, (err, results) => {
        if (err) return renderErrorPopup(res, "ค้นหาข้อมูลไม่สำเร็จ", err.message);
        
        // ad.find คืนค่ามาเป็น Array ตรวจสอบว่าเจอ User ไหม
        if (!results || !results.users || results.users.length === 0) {
            return renderErrorPopup(res, "ไม่พบผู้ใช้งาน", "User Not Found");
        }

        const user = results.users[0];

        // 🔍 Debug: ดูข้อมูลดิบที่ได้จาก LDAP (เช็คว่า memberOf มาไหม)
        console.log("📥 Raw User Data:", JSON.stringify(user, null, 2));

        // ดึงรายชื่อกลุ่มทั้งหมดในระบบ (เพื่อเอาไปใส่ใน Dropdown)
        ad.findGroups('cn=*', (err, allGroups) => {
            if (err) return renderErrorPopup(res, "ดึงข้อมูล Group ไม่สำเร็จ", err.message);

            if (allGroups) {
                allGroups.sort((a, b) => (a.cn || "").localeCompare(b.cn || ""));
            }

            // ✅ จัดการข้อมูลกลุ่มของ User
            let currentUserGroups = [];
            
            if (user.memberOf) {
                // แปลงให้เป็น Array เสมอ
                const groupsArray = Array.isArray(user.memberOf) ? user.memberOf : [user.memberOf];
                
                currentUserGroups = groupsArray.map(dn => {
                    // แกะชื่อกลุ่มจาก DN
                    const cnMatch = dn.match(/CN=([^,]+)/i);
                    const groupName = cnMatch ? cnMatch[1] : dn;
                    return { dn: dn, cn: groupName };
                });
            }

            // (Optional) เพิ่ม Domain Users ถ้าต้องการ (เพราะ LDAP มักไม่ส่ง Primary Group มาใน memberOf)
            // เช็คว่า Primary Group ID คือ 513 (Domain Users) หรือไม่
            if (user.primaryGroupID == 513) {
                 // เช็คกันเหนียวว่ายังไม่มีใน list
                 const hasDomainUsers = currentUserGroups.some(g => g.cn === 'Domain Users');
                 if (!hasDomainUsers) {
                     currentUserGroups.push({
                         dn: `CN=Domain Users,CN=Users,${config.baseDN}`,
                         cn: 'Domain Users'
                     });
                 }
            }

            res.render('manage_groups', { 
                user: user, 
                userGroups: currentUserGroups,
                allGroups: allGroups
            });
        });
    });
};

// -----------------------------------------------------------------------------
// 2. เพิ่ม User เข้า Group (Add User to Group)
// -----------------------------------------------------------------------------
exports.addUserToGroup = (req, res) => {
    const { userDN, groupDN } = req.body;
    
    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return renderErrorPopup(res, "เชื่อมต่อ AD ไม่สำเร็จ", err.message);

        // ✅ แก้ไข: Syntax สำหรับ ldapjs v3 (ต้องระบุ type และ values)
        const change = new ldap.Change({
            operation: 'add',
            modification: {
                type: 'member',     
                values: [userDN]
            }
        });

        client.modify(groupDN, change, (err) => {
            client.unbind();
            
            if (err) {
                console.error("Add Group Error:", err);
                if (err.code === 68 || err.message.includes('Already Exists')) {
                    return renderErrorPopup(res, "แจ้งเตือน", "User รายนี้อยู่ในกลุ่มดังกล่าวอยู่แล้ว");
                }
                return renderErrorPopup(res, "เพิ่มเข้ากลุ่มไม่สำเร็จ", "อาจติด Permission หรือข้อผิดพลาดอื่น", err.message);
            }
            
            // Redirect กลับหน้าเดิม (วิธีใหม่ แก้ Deprecation Warning)
            res.redirect(req.get('Referrer') || '/');
        });
    });
};

// -----------------------------------------------------------------------------
// 3. ลบ User ออกจาก Group (Remove User from Group)
// -----------------------------------------------------------------------------
exports.removeUserFromGroup = (req, res) => {
    const { userDN, groupDN } = req.body;

    const client = ldap.createClient({ url: config.url });
    client.bind(config.username, config.password, (err) => {
        if (err) return renderErrorPopup(res, "เชื่อมต่อ AD ไม่สำเร็จ", err.message);

        // ✅ แก้ไข: Syntax สำหรับ ldapjs v3
        const change = new ldap.Change({
            operation: 'delete',
            modification: {
                type: 'member',     
                values: [userDN]
            }
        });

        client.modify(groupDN, change, (err) => {
            client.unbind();

            if (err) {
                console.error("Remove Group Error:", err);
                return renderErrorPopup(res, "นำออกจากกลุ่มไม่สำเร็จ", "เกิดข้อผิดพลาดในการลบ", err.message);
            }
            
            // Redirect กลับหน้าเดิม
            res.redirect(req.get('Referrer') || '/');
        });
    });
};