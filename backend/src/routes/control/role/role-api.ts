import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { id_checker_middleware } from '../../../middleware/id-validator-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  addRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  updateRole,
} from './role-controller';

const router = Router();

// The whole role surface mutates/reads the RBAC system itself, so it is
// Admin-only. (auth alone is not enough: any logged-in user could otherwise
// create/rename/delete roles or enumerate them.)
router.use(auth_middleware, requireRole('Admin'));

router.get('/getAllRoles', asyncHandler(getAllRoles));
router.get('/getRoleById/:id', id_checker_middleware, asyncHandler(getRoleById));
router.post('/addRole', asyncHandler(addRole));
router.put('/updateRole/:id', id_checker_middleware, asyncHandler(updateRole));
router.delete('/deleteRole/:id', id_checker_middleware, asyncHandler(deleteRole));

export default router;
