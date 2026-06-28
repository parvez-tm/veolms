import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { id_checker_middleware } from '../../../middleware/id-validator-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  addPermission,
  getAllPermission,
  getPermissionByRole,
} from './permission-controller';

const router = Router();

// Admin-only: addPermission atomically REPLACES a role's entire permission set,
// so leaving it open to any authenticated user is a privilege-escalation hole.
// Reads are gated too (they expose the full RBAC matrix).
router.use(auth_middleware, requireRole('Admin'));

router.get('/getAllPermissions', asyncHandler(getAllPermission));
router.get(
  '/getPermissionByRole/:id',
  id_checker_middleware,
  asyncHandler(getPermissionByRole)
);
router.post('/addPermission', asyncHandler(addPermission));

export default router;
