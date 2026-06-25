import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import { getAllMenus } from './menu-controller';

const router = Router();

router.get('/getAllMenus', auth_middleware, asyncHandler(getAllMenus));

export default router;
