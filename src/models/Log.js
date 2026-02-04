// src/models/Log.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // เรียกใช้ไฟล์ database.js ที่เราเพิ่งสร้าง

const Log = sequelize.define('Log', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: { // ใครทำ?
        type: DataTypes.STRING,
        allowNull: false
    },
    action: { // ทำอะไร?
        type: DataTypes.STRING,
        allowNull: false
    },
    target: { // ทำกับใคร/อะไร?
        type: DataTypes.STRING,
        allowNull: true
    },
    status: { // ผลลัพธ์
        type: DataTypes.ENUM('SUCCESS', 'FAILED'),
        defaultValue: 'SUCCESS'
    },
    details: { // รายละเอียด (เช่น Error)
        type: DataTypes.TEXT,
        allowNull: true
    },
    ip_address: { // มาจาก IP ไหน
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'audit_logs', // ชื่อตารางใน DB
    timestamps: true, // มี createdAt ให้รู้ว่าทำเมื่อไหร่
    updatedAt: false // ไม่ต้องมี updatedAt
});

module.exports = Log;