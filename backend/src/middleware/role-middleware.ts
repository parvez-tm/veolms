import { RequestHandler } from 'express';
import { ApiError } from '../types/interface';

/**
 * Restrict a route to the given role names. Must run AFTER auth_middleware
 * (which populates req.user). Returns 403 if the user's role isn't allowed.
 */
export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    const role = req.user?.roleName;
    if (!role || !roles.includes(role)) {
      return next(new ApiError(403, 'Insufficient permissions for this action'));
    }
    next();
  };

/** True if the user is an Admin (full access) or the owner of a resource. */
export const isAdminOrOwner = (
  user: { id: number; roleName: string } | undefined,
  ownerId: number | null
): boolean =>
  !!user && (user.roleName === 'Admin' || (ownerId !== null && user.id === ownerId));
