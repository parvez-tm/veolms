import multer from 'multer';
import { ApiError } from '../types/interface';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/**
 * In-memory upload for profile images; the controller streams the buffer to R2.
 * No local disk is used, so the app stays stateless. Large media (video) uses
 * presigned direct-to-R2 uploads instead (see media-controller).
 */
export const profileImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image uploads are allowed (jpeg, png, gif, webp)'));
    }
  },
});
