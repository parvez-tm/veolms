import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import { getOverviewStats } from './stats-controller';

const router = Router();

router.get(
  '/overview',
  auth_middleware,
  requireRole('Admin', 'Instructor'),
  asyncHandler(getOverviewStats)
);

export default router;
