import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { id_checker_middleware } from '../../../middleware/id-validator-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  addPermission,
  getAllPermission,
  getPermissionByRole,
} from './permission-controller';

const router = Router();

router.get('/getAllPermissions', auth_middleware, asyncHandler(getAllPermission));
router.get(
  '/getPermissionByRole/:id',
  auth_middleware,
  id_checker_middleware,
  asyncHandler(getPermissionByRole)
);
router.post('/addPermission', auth_middleware, asyncHandler(addPermission));

export default router;
