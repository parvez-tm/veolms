import { Request, Response } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Op, Transaction } from 'sequelize';
import { User } from './user-model';
import { Role } from '../role/role-model';
import { Permission } from '../permission/permission-model';
import { Menu } from '../menu/menu-model';
import { env } from '../../../config/env';
import { sequelize } from '../../../db/sequelize';
import {
  issueSession,
  consumeRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  clearSessionCookies,
  REFRESH_COOKIE,
} from '../../../services/token-service';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../../services/email-service';
import {
  calculatePaginationInfo,
  parseRequestParams,
} from '../../../helpers/filters';
import { ApiError, JwtPayload, PermissionMap } from '../../../types/interface';
import { MediaAsset } from '../../lms/media/media-asset-model';
import {
  menuToSummary,
  permissionToFlags,
} from '../../../helpers/permission-mapper';
import {
  getRolePermissionMap,
  setRolePermissionMap,
} from '../../../services/permission-cache-service';
import {
  isStorageConfigured,
  buildStorageKey,
  putObject,
  deleteObject,
  createPlaybackUrl,
} from '../../../services/storage-service';
import {
  createReadyAsset,
  purgeAssetsByIds,
  assetReferenceCount,
} from '../../../services/media-service';

const USER_FIELDS = [
  'userName',
  'firstName',
  'lastName',
  'email',
  'password',
  'roleId',
  'dateOfBirth',
  'phone',
  'address',
] as const;

/** Upload an avatar buffer to R2 and create a ready MediaAsset; returns its id. */
async function uploadAvatar(
  file: Express.Multer.File,
  uploaderId: number
): Promise<number> {
  if (!isStorageConfigured()) {
    throw new ApiError(503, 'Media storage (R2) is not configured');
  }
  const key = buildStorageKey('avatars', uploaderId, file.originalname);
  await putObject(key, file.buffer, file.mimetype);
  try {
    const asset = await createReadyAsset({
      kind: 'image',
      contentType: file.mimetype,
      storageKey: key,
      originalName: file.originalname,
      sizeBytes: file.size,
      uploadedById: uploaderId,
    });
    return asset.id;
  } catch (err) {
    // The object is uploaded but the row failed, so delete the object so it isn't
    // an untracked orphan, then surface the error.
    await deleteObject(key).catch(() => undefined);
    throw err;
  }
}

/** Short-lived presigned URL for a user's avatar, or null. */
async function buildAvatarUrl(avatarAssetId: number | null): Promise<string | null> {
  if (!avatarAssetId || !isStorageConfigured()) return null;
  const asset = await MediaAsset.findByPk(avatarAssetId, {
    attributes: ['id', 'storageKey', 'contentType'],
  });
  if (!asset) return null;
  const { url } = await createPlaybackUrl(asset.storageKey, asset.contentType);
  return url;
}

const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

/** Build the JWT/req.user payload from a user + its (loaded) role. */
function buildPayload(user: User, role: Role): JwtPayload {
  return {
    id: user.id,
    userName: user.userName,
    email: user.email,
    roleId: role.id,
    roleName: role.roleName,
    lastPermissionUpdate: role.lastPermissionUpdate.toISOString(),
  };
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const { userDetail, password } = req.body ?? {};
  if (!userDetail || !password) {
    throw new ApiError(400, 'Please provide login credentials');
  }

  // Bypass the default scope so the password hash is available for comparison.
  const user = await User.unscoped().findOne({
    where: { [Op.or]: [{ email: userDetail }, { userName: userDetail }] },
    include: [{ model: Role, as: 'role' }],
  });
  if (!user || !user.role) {
    throw new ApiError(404, 'User Not Found');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(400, 'Invalid credentials');
  }

  // Permission map drives the admin-panel nav; an empty map is valid (e.g. a
  // student/instructor with no admin-menu permissions) and must not block login.
  const permissions = await buildPermissionMap(user.role.id);
  const payload = buildPayload(user, user.role);

  // Set httpOnly access + rotating refresh cookies; the CSRF token is returned
  // so the SPA can echo it on mutating requests.
  const csrfToken = await issueSession(res, payload);

  res.status(200).json({
    message: 'Login successful',
    data: { ...payload, isVerified: user.isVerified },
    permissions,
    csrfToken,
  });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public self-service signup. Always creates a **Student** (the role is never
 * taken from the client, so this can't be used to mint admins) and auto-logs the
 * user in by returning the same token/permission payload as login.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, email, password } = req.body ?? {};
  const userName: string =
    typeof req.body?.userName === 'string' && req.body.userName.trim()
      ? req.body.userName.trim()
      : typeof email === 'string'
        ? email
        : '';

  if (!firstName || !lastName || !email || !password) {
    throw new ApiError(400, 'Please enter name, email and password');
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    throw new ApiError(400, 'Please enter a valid email address');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  await assertNoDuplicateUser(userName, email);

  const studentRole = await Role.findOne({ where: { roleName: 'Student' } });
  if (!studentRole) {
    throw new ApiError(500, 'Student role is not configured');
  }

  // Issue an email-verification token (verification is non-blocking: the account
  // is usable immediately, and a banner nudges the user to verify).
  const verifyRaw = crypto.randomBytes(32).toString('hex');
  const created = await User.create({
    userName,
    firstName,
    lastName,
    email,
    password, // hashed by the beforeSave hook
    roleId: studentRole.id,
    emailVerifyTokenHash: sha256(verifyRaw),
    emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Best-effort: a mail failure must not break signup.
  try {
    await sendVerificationEmail(
      created.email,
      `${env.appUrl}/verify-email?token=${verifyRaw}`
    );
  } catch (err) {
    console.error('Verification email failed:', (err as Error).message);
  }

  const payload = buildPayload(created, studentRole);
  const csrfToken = await issueSession(res, payload);
  const permissions = await buildPermissionMap(studentRole.id);

  res.status(201).json({
    message: 'Registration successful',
    data: { ...payload, isVerified: false },
    permissions,
    csrfToken,
  });
};

/**
 * Self-serve upgrade: a logged-in **Student** opts into teaching and becomes an
 * **Instructor**. Hardened against privilege escalation: the target role is
 * hardcoded to Instructor (never read from the client, never Admin), and we only
 * ever promote a Student. Because the role lives in the JWT, we re-issue a fresh
 * token so the new permissions take effect immediately.
 */
export const becomeInstructor = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await User.findByPk(req.user!.id, {
    include: [{ model: Role, as: 'role' }],
  });
  if (!user || !user.role) {
    throw new ApiError(404, 'User not found');
  }
  if (user.role.roleName === 'Instructor' || user.role.roleName === 'Admin') {
    throw new ApiError(400, 'You can already create courses');
  }
  if (user.role.roleName !== 'Student') {
    throw new ApiError(403, 'Only students can become instructors');
  }

  const instructorRole = await Role.findOne({
    where: { roleName: 'Instructor' },
  });
  if (!instructorRole) {
    throw new ApiError(500, 'Instructor role is not configured');
  }

  user.roleId = instructorRole.id; // only roleId changes, so the password hook won't run
  await user.save();

  // Re-issue the session so the new role/permissions take effect immediately.
  const payload = buildPayload(user, instructorRole);
  const csrfToken = await issueSession(res, payload);
  const permissions = await buildPermissionMap(instructorRole.id);

  res.status(200).json({
    message: 'You are now an instructor',
    data: { ...payload, isVerified: user.isVerified },
    permissions,
    csrfToken,
  });
};

/**
 * Rotate the session from a valid refresh cookie: consume the presented refresh
 * token, re-read the user + role, and issue a fresh access/refresh/CSRF set.
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!raw) {
    throw new ApiError(401, 'No active session');
  }
  const userId = await consumeRefreshToken(raw);
  if (!userId) {
    // Do NOT clear cookies here: with strict rotation, two tabs refreshing at
    // once means the slower one presents an already-consumed token. Clearing
    // would wipe the cookies the winning tab just rotated in and log both out.
    // Just 401; the client re-syncs (the winner's success broadcasts via the
    // USER_KEY storage event), and a genuinely dead cookie is harmless.
    throw new ApiError(401, 'Session expired. Please log in again');
  }
  const user = await User.findByPk(userId, { include: [{ model: Role, as: 'role' }] });
  if (!user || !user.role) {
    clearSessionCookies(res);
    throw new ApiError(401, 'Session is no longer valid');
  }
  const payload = buildPayload(user, user.role);
  const csrfToken = await issueSession(res, payload);
  const permissions = await buildPermissionMap(user.role.id);
  res.status(200).json({
    message: 'Session refreshed',
    data: { ...payload, isVerified: user.isVerified },
    permissions,
    csrfToken,
  });
};

/** Clear the session: revoke the refresh token and clear all auth cookies. */
export const logout = async (req: Request, res: Response): Promise<void> => {
  await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE] as string | undefined);
  clearSessionCookies(res);
  res.status(200).json({ message: 'Logged out' });
};

/** Current authenticated user's profile (used to bootstrap the SPA). */
export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByPk(req.user!.id, {
    include: [{ model: Role, as: 'role' }],
  });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.status(200).json({
    data: { ...user.toJSON(), avatarUrl: await buildAvatarUrl(user.avatarAssetId ?? null) },
    message: 'ok',
  });
};

/**
 * Start a password reset. Always responds 200 (never reveals whether the email
 * exists). If it does, a single-use token (hash stored, 1h expiry) is emailed.
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body ?? {};
  if (typeof email === 'string' && EMAIL_RE.test(email)) {
    const user = await User.unscoped().findOne({ where: { email } });
    if (user) {
      const raw = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = sha256(raw);
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save(); // password not changed → hashing hook is a no-op
      try {
        await sendPasswordResetEmail(
          user.email,
          `${env.appUrl}/reset-password?token=${raw}`
        );
      } catch (err) {
        console.error('Reset email failed:', (err as Error).message);
      }
    }
  }
  res
    .status(200)
    .json({ message: 'If that email is registered, a reset link has been sent.' });
};

/** Complete a password reset with a valid token; revokes all existing sessions. */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body ?? {};
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'A valid token and a password (min 8 characters) are required');
  }
  const user = await User.unscoped().findOne({
    where: {
      passwordResetTokenHash: sha256(token),
      passwordResetExpires: { [Op.gt]: new Date() },
    },
  });
  if (!user) {
    throw new ApiError(400, 'This reset link is invalid or has expired');
  }
  user.password = password; // hashed by the beforeSave hook
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();
  await revokeAllForUser(user.id); // force re-login everywhere
  res.status(200).json({ message: 'Password updated. Please log in.' });
};

/** Verify an email address from the emailed token. */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body ?? {};
  if (typeof token !== 'string' || token.trim() === '') {
    throw new ApiError(400, 'Verification token is required');
  }
  const user = await User.unscoped().findOne({
    where: {
      emailVerifyTokenHash: sha256(token),
      emailVerifyExpires: { [Op.gt]: new Date() },
    },
  });
  if (!user) {
    throw new ApiError(400, 'This verification link is invalid or has expired');
  }
  user.isVerified = true;
  user.emailVerifyTokenHash = null;
  user.emailVerifyExpires = null;
  await user.save();
  res.status(200).json({ message: 'Email verified' });
};

/** Re-send the verification email to the current user. */
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  const user = await User.unscoped().findByPk(req.user!.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  if (user.isVerified) {
    res.status(200).json({ message: 'Your email is already verified' });
    return;
  }
  const raw = crypto.randomBytes(32).toString('hex');
  user.emailVerifyTokenHash = sha256(raw);
  user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  try {
    await sendVerificationEmail(user.email, `${env.appUrl}/verify-email?token=${raw}`);
  } catch (err) {
    console.error('Verification email failed:', (err as Error).message);
  }
  res.status(200).json({ message: 'Verification email sent' });
};

/** Build (or read from Redis) the read-enabled permission map for a role. */
async function buildPermissionMap(roleId: number): Promise<PermissionMap[]> {
  const cached = await getRolePermissionMap(roleId);
  if (cached) return cached;

  const permissions = await Permission.findAll({
    where: { roleId, canRead: true },
    include: [{ model: Menu, as: 'menu' }],
  });

  const map: PermissionMap[] = permissions
    .filter((perm) => perm.menu)
    .map((perm) => ({
      menu: menuToSummary(perm.menu as Menu),
      ...permissionToFlags(perm),
    }));

  await setRolePermissionMap(roleId, map);
  return map;
}

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { where, order, limit, offset, page } = parseRequestParams(req, User);

  const { rows, count } = await User.findAndCountAll({
    where,
    order,
    limit,
    offset,
    include: [{ model: Role, as: 'role' }],
    distinct: true,
  });

  res.status(200).json({
    data: rows,
    pagination: calculatePaginationInfo(count, limit, page),
  });
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Self-or-admin: a user may read only their own profile (no enumeration of others).
  if (req.user!.roleName !== 'Admin' && req.user!.id !== Number(req.params.id)) {
    throw new ApiError(403, 'You can only view your own profile');
  }
  const user = await User.findByPk(req.params.id, {
    include: [{ model: Role, as: 'role' }],
  });
  if (!user) {
    throw new ApiError(404, 'No User Found');
  }
  const avatarUrl = await buildAvatarUrl(user.avatarAssetId ?? null);
  res
    .status(200)
    .json({ data: { ...user.toJSON(), avatarUrl }, message: 'User found successfully' });
};

/** Presigned URL for a user's avatar (issued individually to avoid N presigns in lists). */
export const getAvatar = async (req: Request, res: Response): Promise<void> => {
  if (req.user!.roleName !== 'Admin' && req.user!.id !== Number(req.params.id)) {
    throw new ApiError(403, 'You can only view your own avatar');
  }
  const user = await User.findByPk(req.params.id, {
    attributes: ['id', 'avatarAssetId'],
  });
  if (!user) {
    throw new ApiError(404, 'No User Found');
  }
  res.status(200).json({ data: { url: await buildAvatarUrl(user.avatarAssetId ?? null) } });
};

export const addUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password, userName, firstName, lastName, roleId } =
    req.body ?? {};
  if (!email || !password || !userName || !firstName || !lastName || !roleId) {
    throw new ApiError(400, 'Please enter all required fields');
  }

  await assertNoDuplicateUser(userName, email);

  // Upload the avatar only after validation so we don't orphan an object on a
  // rejected request; roll it back if the user row fails to create.
  const avatarAssetId = req.file
    ? await uploadAvatar(req.file, req.user!.id)
    : null;

  let created;
  try {
    created = await User.create({
      userName,
      firstName,
      lastName,
      email,
      password,
      roleId,
      dateOfBirth: req.body.dateOfBirth ?? null,
      phone: req.body.phone ?? null,
      address: req.body.address ?? null,
      avatarAssetId,
    });
  } catch (err) {
    if (avatarAssetId) await purgeAssetsByIds([avatarAssetId]);
    throw err;
  }

  // Re-fetch under the default scope so the password hash is never returned.
  const user = await User.findByPk(created.id, {
    include: [{ model: Role, as: 'role' }],
  });
  res.status(201).json({
    data: { ...user!.toJSON(), avatarUrl: await buildAvatarUrl(avatarAssetId) },
    message: 'User registered successfully',
  });
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const targetId = Number(req.params.id);
  const isAdmin = req.user!.roleName === 'Admin';
  // Self-or-admin: a user may edit only their own profile.
  if (!isAdmin && req.user!.id !== targetId) {
    throw new ApiError(403, 'You can only update your own profile');
  }

  // Non-admins cannot change their own role (no self-escalation).
  const body: Record<string, unknown> = { ...(req.body ?? {}) };
  if (!isAdmin) delete body.roleId;

  // Upload the new avatar (if any) before the transaction; roll it back on failure.
  const newAvatarAssetId = req.file
    ? await uploadAvatar(req.file, req.user!.id)
    : null;

  let oldAvatarAssetId: number | null = null;
  try {
    await sequelize.transaction(async (t) => {
      // Row lock serializes concurrent updates so an avatar swap can't orphan.
      const user = await User.unscoped().findByPk(targetId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!user) {
        throw new ApiError(404, 'No User Found');
      }
      await assertNoDuplicateUser(
        (body.userName as string) ?? user.userName,
        (body.email as string) ?? user.email,
        user.id,
        t
      );
      oldAvatarAssetId = user.avatarAssetId ?? null;
      // save() runs the beforeSave hook, which hashes the password only if changed.
      user.set(pickUserFields(body) as Partial<User>);
      if (newAvatarAssetId !== null) user.avatarAssetId = newAvatarAssetId;
      await user.save({ transaction: t });
    });
  } catch (err) {
    if (newAvatarAssetId) {
      await purgeAssetsByIds([newAvatarAssetId]).catch(() => undefined);
    }
    throw err;
  }

  // Replaced avatar is now unreferenced. Best-effort purge (must not fail the request).
  if (
    newAvatarAssetId !== null &&
    oldAvatarAssetId &&
    oldAvatarAssetId !== newAvatarAssetId
  ) {
    await purgeAssetsByIds([oldAvatarAssetId]).catch((e) =>
      console.warn('Old avatar purge failed:', (e as Error).message)
    );
  }

  const fresh = await User.findByPk(targetId, {
    include: [{ model: Role, as: 'role' }],
  });
  res.status(200).json({
    data: {
      ...fresh!.toJSON(),
      avatarUrl: await buildAvatarUrl(fresh!.avatarAssetId ?? null),
    },
    message: 'User updated successfully',
  });
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByPk(req.params.id, {
    attributes: ['id', 'avatarAssetId'],
  });
  if (!user) {
    throw new ApiError(404, 'No User Found');
  }

  // Decide which assets are safe to purge BEFORE removing the user; never delete
  // an object still referenced by another user/lesson.
  const purgeIds: number[] = [];

  if (user.avatarAssetId) {
    const sharedWithOthers = await User.count({
      where: { avatarAssetId: user.avatarAssetId, id: { [Op.ne]: user.id } },
    });
    if (sharedWithOthers === 0) purgeIds.push(user.avatarAssetId);
  }

  const uploaded = await MediaAsset.findAll({
    where: { uploadedById: user.id },
    attributes: ['id'],
  });
  for (const asset of uploaded) {
    if (asset.id === user.avatarAssetId) continue;
    if ((await assetReferenceCount(asset.id)) === 0) purgeIds.push(asset.id);
  }

  // Destroy first: if it fails (FK RESTRICT for an instructor with courses) nothing
  // has been purged. uploadedById SET NULL keeps still-referenced assets intact.
  await user.destroy();
  await purgeAssetsByIds(purgeIds);

  res.status(200).json({ message: 'User deleted successfully' });
};

/** Whitelist only known, settable user fields (prevents mass assignment). */
function pickUserFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of USER_FIELDS) {
    if (body?.[field] !== undefined) {
      out[field] = body[field];
    }
  }
  return out;
}

async function assertNoDuplicateUser(
  userName: string,
  email: string,
  excludeId?: number,
  transaction?: Transaction
): Promise<void> {
  const where: Record<string, unknown> = {
    [Op.or]: [{ userName }, { email }],
  };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const existing = await User.findOne({ where, transaction });
  if (!existing) return;

  if (existing.email === email) {
    throw new ApiError(409, 'User email already exists');
  }
  if (existing.userName === userName) {
    throw new ApiError(409, 'Username already exists');
  }
  throw new ApiError(409, 'User already exists');
}
