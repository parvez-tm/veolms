import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  completeLesson,
  getCourseProgress,
  updatePosition,
} from './progress-controller';

const router = Router();

router.post('/completeLesson', auth_middleware, asyncHandler(completeLesson));
router.post('/updatePosition', auth_middleware, asyncHandler(updatePosition));
router.get(
  '/getCourseProgress/:courseId',
  auth_middleware,
  asyncHandler(getCourseProgress)
);

export default router;
