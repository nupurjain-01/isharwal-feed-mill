import express from 'express';
import {
  createExpectedVisitor,
  getExpectedVisitors,
  convertToCheckIn,
  cancelExpectedVisitor
} from '../controllers/expectedVisitorController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createExpectedVisitor);
router.get('/', protect, getExpectedVisitors);
router.post('/:id/checkin', protect, convertToCheckIn);
router.put('/:id/cancel', protect, cancelExpectedVisitor);

export default router;
