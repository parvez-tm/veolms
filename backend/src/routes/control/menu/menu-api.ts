import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import { getAllMenus } from './menu-controller';

const router = Router();

// The menu list is part of the admin-panel surface; Admin-only.
router.get('/getAllMenus', auth_middleware, requireRole('Admin'), asyncHandler(getAllMenus));

export default router;
