import express from 'express';
import { login, getMe, getAllUsers, createUser, toggleUserStatus, changeCredentials } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/change-credentials', changeCredentials);
router.get('/me', protect, getMe);

// User Management (Admin only)
router.get('/users', protect, authorize('admin'), getAllUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.put('/users/:id/toggle', protect, authorize('admin'), toggleUserStatus);

export default router;
