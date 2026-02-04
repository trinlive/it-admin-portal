// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// เชื่อมต่อ Database
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false, // ปิด Log SQL รกๆ
        timezone: '+07:00', // เวลาไทย
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

module.exports = sequelize;