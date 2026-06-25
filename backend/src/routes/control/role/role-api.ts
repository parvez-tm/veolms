import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
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

router.get('/getAllRoles', auth_middleware, asyncHandler(getAllRoles));
router.get(
  '/getRoleById/:id',
  auth_middleware,
  id_checker_middleware,
  asyncHandler(getRoleById)
);
router.post('/addRole', auth_middleware, asyncHandler(addRole));
router.put(
  '/updateRole/:id',
  auth_middleware,
  id_checker_middleware,
  asyncHandler(updateRole)
);
router.delete(
  '/deleteRole/:id',
  auth_middleware,
  id_checker_middleware,
  asyncHandler(deleteRole)
);

export default router;
