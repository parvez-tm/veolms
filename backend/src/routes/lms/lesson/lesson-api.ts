import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { id_checker_middleware } from '../../../middleware/id-validator-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  addLesson,
  deleteLesson,
  getLessonById,
  getLessonPlayback,
  updateLesson,
} from './lesson-controller';

const router = Router();

const instructor = requireRole('Admin', 'Instructor');

router.get(
  '/getLessonById/:id',
  auth_middleware,
  id_checker_middleware,
  asyncHandler(getLessonById)
);
router.get(
  '/getPlayback/:id',
  auth_middleware,
  id_checker_middleware,
  asyncHandler(getLessonPlayback)
);
router.post('/addLesson', auth_middleware, instructor, asyncHandler(addLesson));
router.put(
  '/updateLesson/:id',
  auth_middleware,
  instructor,
  id_checker_middleware,
  asyncHandler(updateLesson)
);
router.delete(
  '/deleteLesson/:id',
  auth_middleware,
  instructor,
  id_checker_middleware,
  asyncHandler(deleteLesson)
);

export default router;
