import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadDir = path.resolve(__dirname, '../uploads/photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage for visitor photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `visitor_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG) are allowed!'));
    }
  }
});

// Photo upload endpoint
router.post('/photo', protect, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please provide an image file' });
  }

  const relativeUrl = `/uploads/photos/${req.file.filename}`;
  res.status(200).json({
    success: true,
    message: 'Photo uploaded successfully',
    photoUrl: relativeUrl
  });
});

// Base64 webcam capture upload endpoint
router.post('/webcam-photo', protect, (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'No image data provided' });
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `visitor_cam_${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, buffer);
    const relativeUrl = `/uploads/photos/${filename}`;

    res.status(200).json({
      success: true,
      message: 'Webcam photo saved successfully',
      photoUrl: relativeUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
