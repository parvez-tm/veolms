import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { id_checker_middleware } from '../../../middleware/id-validator-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  addSection,
  deleteSection,
  getSectionsByCourse,
  updateSection,
} from './section-controller';

const router = Router();

const instructor = requireRole('Admin', 'Instructor');

router.get('/getByCourse/:courseId', auth_middleware, asyncHandler(getSectionsByCourse));
router.post('/addSection', auth_middleware, instructor, asyncHandler(addSection));
router.put(
  '/updateSection/:id',
  auth_middleware,
  instructor,
  id_checker_middleware,
  asyncHandler(updateSection)
);
router.delete(
  '/deleteSection/:id',
  auth_middleware,
  instructor,
  id_checker_middleware,
  asyncHandler(deleteSection)
);

export default router;
