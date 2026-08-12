/**
 * Upload route — Cloudinary image uploads.
 * Mounted at /api/upload
 *
 * Accepts multipart form data with an `image` field.
 * Returns the Cloudinary secure_url on success.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

// Configure Cloudinary from CLOUDINARY_URL env var
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer config — store files temporarily on disk
const storage = multer.diskStorage({
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.') as Error);
    }
  },
});

/* ── POST /api/upload/image ─────────────────────────────────────────── */
router.post('/image', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No image file provided.');
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'truthloop',
      resource_type: 'image',
      transformation: [
        { width: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /api/upload/image/:publicId ────────────────────────────── */
router.delete('/image/:publicId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const publicId = req.params.publicId as string;

    await cloudinary.uploader.destroy(publicId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
