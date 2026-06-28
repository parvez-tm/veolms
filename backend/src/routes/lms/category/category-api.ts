import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { id_checker_middleware } from '../../../middleware/id-validator-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  addCategory,
  deleteCategory,
  getAllCategories,
  getPublicCategories,
  updateCategory,
} from './category-controller';

const router = Router();

// Public: the homepage/catalog browse lists categories (with course counts).
router.get('/catalog', asyncHandler(getPublicCategories));
router.get('/getAllCategories', auth_middleware, asyncHandler(getAllCategories));
router.post(
  '/addCategory',
  auth_middleware,
  requireRole('Admin', 'Instructor'),
  asyncHandler(addCategory)
);
router.put(
  '/updateCategory/:id',
  auth_middleware,
  requireRole('Admin', 'Instructor'),
  id_checker_middleware,
  asyncHandler(updateCategory)
);
router.delete(
  '/deleteCategory/:id',
  auth_middleware,
  requireRole('Admin'),
  id_checker_middleware,
  asyncHandler(deleteCategory)
);

export default router;
