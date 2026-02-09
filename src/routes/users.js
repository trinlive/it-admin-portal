// src/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const groupController = require('../controllers/groupController');
const { isAuthenticated } = require('../middleware/auth'); // ✅ Import Middleware เข้ามา

// ============================================================================
// 🔒 User Management Routes (Protected by Login)
// ============================================================================

// Dashboard (หน้าหลัก)
router.get('/', isAuthenticated, userController.getDashboard);

// Create User
router.get('/create', isAuthenticated, userController.getCreatePage);
router.post('/users/create', isAuthenticated, userController.createUser);

// Delete User
router.post('/users/delete', isAuthenticated, userController.deleteUser);

// Edit User
router.get('/edit/:username', isAuthenticated, userController.getEditPage);
router.post('/users/update', isAuthenticated, userController.updateUser);

// User Actions (Reset Password, Disable/Enable, Unlock)
router.post('/users/reset-password', isAuthenticated, userController.resetPassword);
router.post('/users/toggle-status', isAuthenticated, userController.toggleUserStatus);
router.post('/users/unlock', isAuthenticated, userController.unlockUser);

// ============================================================================
// 🔒 Group Management Routes (Protected by Login)
// ============================================================================

// Manage Groups Page
router.get('/groups/:username', isAuthenticated, groupController.getManageGroupsPage);

// Add/Remove Member
router.post('/groups/add', isAuthenticated, groupController.addUserToGroup);
router.post('/groups/remove', isAuthenticated, groupController.removeUserFromGroup);

module.exports = router;