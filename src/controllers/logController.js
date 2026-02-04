const { Op } = require('sequelize');
const Log = require('../models/Log');

exports.getLogs = async (req, res) => {
    try {
        // 1. รับค่าตัวกรองจาก URL (Query String)
        const { search, startDate, endDate, status, limit } = req.query;

        // 2. สร้างเงื่อนไขการค้นหา (Where Clause)
        let whereCondition = {};

        // 🔍 ค้นหาด้วยคำ (Search Text)
        if (search) {
            whereCondition[Op.or] = [
                { username: { [Op.like]: `%${search}%` } },
                { action: { [Op.like]: `%${search}%` } },
                { target: { [Op.like]: `%${search}%` } },
                { details: { [Op.like]: `%${search}%` } }
            ];
        }

        // 📅 กรองตามวันที่ (Date Range)
        if (startDate || endDate) {
            whereCondition.createdAt = {};
            if (startDate) {
                whereCondition.createdAt[Op.gte] = new Date(`${startDate} 00:00:00`);
            }
            if (endDate) {
                whereCondition.createdAt[Op.lte] = new Date(`${endDate} 23:59:59`);
            }
        }

        // ✅ กรองสถานะ (Success/Failed)
        if (status) {
            whereCondition.status = status;
        }

        // 3. ดึงข้อมูลจาก Database
        const limitVal = parseInt(limit) || 100; // ค่าเริ่มต้น 100 รายการ
        const logs = await Log.findAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit: limitVal === -1 ? null : limitVal // ถ้าเลือก All (-1) ให้ดึงหมด
        });

        // 4. ส่งข้อมูลกลับไปที่หน้าเว็บ พร้อมค่า Filter ปัจจุบัน (เพื่อให้หน้าเว็บคงค่าเดิมไว้)
        res.render('logs', { 
            logs: logs,
            query: req.query // ส่งค่าที่ user เลือกกลับไปแสดงผล
        });

    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).send("เกิดข้อผิดพลาดในการดึงข้อมูล Log");
    }
};