import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  courseStudents,
  enroll,
  myCourses,
  unenroll,
} from './enrollment-controller';

const router = Router();

router.post('/enroll', auth_middleware, asyncHandler(enroll));
router.delete('/unenroll/:courseId', auth_middleware, asyncHandler(unenroll));
router.get('/my-courses', auth_middleware, asyncHandler(myCourses));
router.get(
  '/getCourseStudents/:courseId',
  auth_middleware,
  requireRole('Admin', 'Instructor'),
  asyncHandler(courseStudents)
);

export default router;
