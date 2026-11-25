import express from 'express';
import multer from 'multer';
import {
  getReportsData,
  exportReportsToExcel,
  downloadTemplate,
  importDepartments,
  importEmployees,
  importMaster
} from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure memory storage for Excel parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
    }
  }
});

router.get('/data', protect, getReportsData);
router.get('/export', protect, exportReportsToExcel);
router.get('/templates/:type', protect, downloadTemplate);

// Bulk Import
router.post('/import/master', protect, upload.single('file'), importMaster);
router.post('/import/departments', protect, authorize('admin'), upload.single('file'), importDepartments);
router.post('/import/employees', protect, authorize('admin'), upload.single('file'), importEmployees);

export default router;
