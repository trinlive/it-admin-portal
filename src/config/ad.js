// src/config/ad.js
require("dotenv").config();

const config = {
  url: process.env.AD_URL || "ldap://samba-ad",
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_USER,
  password: process.env.AD_PASS,
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
      "objectClass" // ✅ เพิ่มบรรทัดนี้ครับ
    ],
  },
};

module.exports = config;