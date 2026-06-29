import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import { id_checker_middleware } from '../../../middleware/id-validator-middleware';
import { authLimiter } from '../../../middleware/rate-limit-middleware';
import { profileImage } from '../../../services/multer-service';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  addUser,
  becomeInstructor,
  deleteUser,
  forgotPassword,
  getAllUsers,
  getAvatar,
  getUserById,
  login,
  me,
  register,
  resetPassword,
  updateUser,
} from './user-controller';

const router = Router();

router.post('/login', authLimiter, asyncHandler(login));
router.post('/register', authLimiter, asyncHandler(register));
// Logout is handled client-side (the client drops its stored token); there's no
// server session to revoke with stateless JWTs.
router.get('/me', auth_middleware, asyncHandler(me));
// Password reset (public token-based, rate-limited).
router.post('/forgot-password', authLimiter, asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(resetPassword));
router.post('/become-instructor', auth_middleware, asyncHandler(becomeInstructor));
// Listing all users (with emails) is Admin-only. getUserById/getAvatar are
// self-or-admin (enforced in the controller) so a user can read their own profile.
router.get('/getAllUsers', auth_middleware, requireRole('Admin'), asyncHandler(getAllUsers));
router.get(
  '/getUserById/:id',
  auth_middleware,
  id_checker_middleware,
  asyncHandler(getUserById)
);
router.get(
  '/getAvatar/:id',
  auth_middleware,
  id_checker_middleware,
  asyncHandler(getAvatar)
);
// multer runs before auth so the multipart `data` envelope is parsed for auth.
// User creation/deletion is Admin-only; updateUser allows self-or-admin (the
// controller enforces self vs admin and blocks non-admins from changing roleId).
router.post(
  '/addUser',
  profileImage.single('profileImage'),
  auth_middleware,
  requireRole('Admin'),
  asyncHandler(addUser)
);
router.put(
  '/updateUser/:id',
  id_checker_middleware,
  profileImage.single('profileImage'),
  auth_middleware,
  asyncHandler(updateUser)
);
router.delete(
  '/deleteUser/:id',
  auth_middleware,
  requireRole('Admin'),
  id_checker_middleware,
  asyncHandler(deleteUser)
);

export default router;
