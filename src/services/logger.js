// src/services/logger.js
const Log = require('../models/Log');

exports.logAction = async (req, username, action, target, status = 'SUCCESS', details = '') => {
    try {
        // พยายามหา IP Address (รองรับกรณีอยู่หลัง Proxy/Cloudflare)
        let ip = 'Unknown';
        if (req) {
            ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        }

        // แปลง details เป็น string ถ้ามันเป็น object
        const detailText = typeof details === 'object' ? JSON.stringify(details) : details;

        // บันทึกลงฐานข้อมูล
        await Log.create({
            username: username || 'System',
            action: action,
            target: target,
            status: status,
            details: detailText,
            ip_address: ip
        });
        
        // พ่น Log ออกหน้าจอด้วย
        console.log(`📝 [AUDIT] ${username} -> ${action}: ${target} (${status})`);
        
    } catch (error) {
        // ถ้าบันทึก Log ไม่ได้ ห้ามทำให้ App พัง แค่แจ้งเตือนแอดมินทาง Console
        console.error('❌ Logger Error:', error.message);
    }
};