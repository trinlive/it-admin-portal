const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Routes
router.get('/', userController.getDashboard);

router.get('/create', userController.getCreatePage);
router.post('/users/create', userController.createUser);

router.post('/users/delete', userController.deleteUser);

router.get('/edit/:username', userController.getEditPage);
router.post('/users/update', userController.updateUser);

router.post('/users/reset-password', userController.resetPassword);

module.exports = router;