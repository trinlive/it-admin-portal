// src/routes/logs.js
const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { isAuthenticated } = require('../middleware/auth'); // ✅ Import Middleware เข้ามา

// ✅ ใส่ isAuthenticated คั่นไว้ตรงกลาง เพื่อตรวจสอบสิทธิ์ก่อนเข้าหน้า Log
router.get('/logs', isAuthenticated, logController.getLogs);

module.exports = router;