import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env';
import { JwtPayload } from '../types/interface';
import { RefreshToken } from '../routes/control/user/refresh-token-model';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const CSRF_COOKIE = 'csrf_token';

const accessMaxAgeMs = env.jwt.accessTtlSec * 1000;
const refreshMaxAgeMs = env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000;

/**
 * Shared cookie attributes. SameSite=Lax + httpOnly defends against CSRF/XSS
 * token theft; Secure is on in production (HTTPS). Path '/' keeps the cookies
 * valid behind a reverse proxy that rewrites the API path prefix.
 */
function cookieBase(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
} {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.accessTtlSec });
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Issue a full session: set the access-token cookie (JWT), create + set a
 * rotating refresh-token cookie (opaque, stored hashed), and set a readable CSRF
 * cookie. Returns the CSRF token (also handed to the client in the JSON body so
 * the SPA can echo it back in the X-CSRF-Token header).
 */
export async function issueSession(res: Response, payload: JwtPayload): Promise<string> {
  res.cookie(ACCESS_COOKIE, signAccessToken(payload), {
    ...cookieBase(),
    maxAge: accessMaxAgeMs,
  });

  const rawRefresh = crypto.randomBytes(32).toString('hex');
  await RefreshToken.create({
    userId: payload.id,
    tokenHash: hashToken(rawRefresh),
    expiresAt: new Date(Date.now() + refreshMaxAgeMs),
  });
  res.cookie(REFRESH_COOKIE, rawRefresh, { ...cookieBase(), maxAge: refreshMaxAgeMs });

  const csrf = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, csrf, {
    ...cookieBase(),
    httpOnly: false, // the SPA reads this and echoes it in a header
    maxAge: refreshMaxAgeMs,
  });
  return csrf;
}

/**
 * Validate + consume a presented refresh token (rotation): the matching row is
 * deleted and the caller issues a fresh session. Returns the owner's userId, or
 * null if the token is unknown/expired.
 */
export async function consumeRefreshToken(rawRefresh: string): Promise<number | null> {
  const row = await RefreshToken.findOne({ where: { tokenHash: hashToken(rawRefresh) } });
  if (!row) return null;
  await row.destroy();
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row.userId;
}

/** Revoke a single refresh token (logout). No-op if absent/unknown. */
export async function revokeRefreshToken(rawRefresh: string | undefined): Promise<void> {
  if (!rawRefresh) return;
  await RefreshToken.destroy({ where: { tokenHash: hashToken(rawRefresh) } });
}

/** Revoke every refresh token for a user (logout-everywhere / password change). */
export async function revokeAllForUser(userId: number): Promise<void> {
  await RefreshToken.destroy({ where: { userId } });
}

/** Clear all session cookies (logout). */
export function clearSessionCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}
