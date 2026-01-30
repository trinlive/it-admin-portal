// src/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const groupController = require('../controllers/groupController'); // ✅ เพิ่มบรรทัดนี้

// User Routes
router.get('/', userController.getDashboard);
router.get('/create', userController.getCreatePage);
router.post('/users/create', userController.createUser);
router.post('/users/delete', userController.deleteUser);
router.get('/edit/:username', userController.getEditPage);
router.post('/users/update', userController.updateUser);
router.post('/users/reset-password', userController.resetPassword);
router.post('/users/toggle-status', userController.toggleUserStatus);
router.post('/users/unlock', userController.unlockUser);

// Group Routes (เรียกใช้จาก groupController)
router.get('/groups/:username', groupController.getManageGroupsPage);
router.post('/groups/add', groupController.addUserToGroup);
router.post('/groups/remove', groupController.removeUserFromGroup);

module.exports = router;