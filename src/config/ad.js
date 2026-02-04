// src/config/ad.js
require("dotenv").config();

const config = {
  url: process.env.AD_URL || "ldap://samba-ad",
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_USER,
  password: process.env.AD_PASS,

  // ❌ คอมเมนต์ส่วนนี้ออก เพื่อให้ AD ส่งข้อมูลกลับมาให้ครบทุก Attribute
  // (แก้ปัญหา User บางคนไม่แสดงเพราะขาด Attribute บางตัว)
  /*
  attributes: {
    user: [
      "dn",
      "cn",
      "sn",
      "givenName",
      "sAMAccountName",
      "userPrincipalName",
      "mail",
      "department",
      "description",
      "whenCreated",
      "lastLogon",
      "memberOf",
      "userAccountControl",
      "lockoutTime",
      "objectClass"
    ],
  },
  */
};

module.exports = config;