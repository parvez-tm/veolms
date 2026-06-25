import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { id_checker_middleware } from '../../../middleware/id-validator-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  cleanupPending,
  confirmUpload,
  deleteAsset,
  requestUploadUrl,
  hlsPlaylist,
  hlsKey,
} from './media-controller';

const router = Router();

const instructor = requireRole('Admin', 'Instructor');

// HLS playback: authorized by a short-lived ticket in the query (not a JWT
// header), so it works with hls.js and native HLS. Must be before '/:id'.
router.get('/hls/:assetId/playlist', asyncHandler(hlsPlaylist));
router.get('/hls/:assetId/key', asyncHandler(hlsKey));

router.post('/upload-url', auth_middleware, instructor, asyncHandler(requestUploadUrl));
router.post(
  '/cleanup',
  auth_middleware,
  requireRole('Admin'),
  asyncHandler(cleanupPending)
);
router.post(
  '/confirm/:id',
  auth_middleware,
  instructor,
  id_checker_middleware,
  asyncHandler(confirmUpload)
);
router.delete(
  '/:id',
  auth_middleware,
  instructor,
  id_checker_middleware,
  asyncHandler(deleteAsset)
);

export default router;
