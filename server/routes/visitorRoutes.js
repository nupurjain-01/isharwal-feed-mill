import express from 'express';
import {
  createVisitor,
  getVisitors,
  getVisitorById,
  checkOutVisitor,
  deleteVisitor
} from '../controllers/visitorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createVisitor);
router.get('/', protect, getVisitors);
router.get('/:id', protect, getVisitorById);
router.put('/:id/checkout', protect, checkOutVisitor);
router.delete('/:id', protect, authorize('admin'), deleteVisitor);

export default router;
