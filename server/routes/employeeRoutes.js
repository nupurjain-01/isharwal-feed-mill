import express from 'express';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getEmployees);
router.post('/', protect, authorize('admin'), createEmployee);
router.put('/:id', protect, authorize('admin'), updateEmployee);
router.delete('/:id', protect, authorize('admin'), deleteEmployee);

export default router;
