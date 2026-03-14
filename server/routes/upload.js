import { Router } from 'express';
import multer from 'multer';
import { requireAuth, syncUser } from '../middleware/auth.js';
import { uploadToCloudinary } from '../services/cloudinary.js';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, png, gif, webp) and PDFs are allowed'));
    }
  },
});

const router = Router();

router.post('/', requireAuth(), syncUser, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 3MB.' });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      res.json({
        url: result.secure_url,
        type: req.file.mimetype,
        name: req.file.originalname,
        size: req.file.size,
      });
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });
});

export default router;
