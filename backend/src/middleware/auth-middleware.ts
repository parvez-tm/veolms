import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';
import { env } from '../config/env';
import { ApiError, JwtPayload } from '../types/interface';
import { sanitizeData } from '../services/sanitize-service';
import { getRolePermissionVersion } from '../services/permission-cache-service';
import { ACCESS_COOKIE, CSRF_COOKIE } from '../services/token-service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Authenticate the request:
 *  1. Optionally parse + sanitize a multipart `data` JSON envelope.
 *  2. Read the access JWT from the httpOnly cookie (browser) or a Bearer header
 *     (API clients / tests) and verify it.
 *  3. For cookie-authenticated, state-changing requests, enforce a double-submit
 *     CSRF token (X-CSRF-Token header must match the csrf_token cookie). Bearer
 *     requests are exempt: a Bearer header is never auto-sent by browsers.
 *  4. Confirm the role's permissions have not changed since the token was issued
 *     (using the Redis-cached permission version, not a per-request DB hit).
 * On success, attaches the decoded payload to `req.user`.
 */
export const auth_middleware: RequestHandler = async (req, res, next) => {
  try {
    // Multipart form posts may send the JSON body as a stringified `data` field.
    if (typeof req.body?.data === 'string') {
      try {
        req.body = sanitizeData(JSON.parse(req.body.data));
      } catch {
        return next(new ApiError(400, 'Invalid JSON payload'));
      }
    }

    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';
    const cookieToken = (req.cookies?.[ACCESS_COOKIE] as string | undefined) ?? '';
    const token = bearer || cookieToken;
    const fromCookie = !bearer && !!cookieToken;

    if (!token) {
      res
        .status(401)
        .json({ message: 'Authorization token missing or malformed' });
      return;
    }

    // CSRF guard for cookie-based sessions on mutating requests.
    if (fromCookie && !SAFE_METHODS.has(req.method)) {
      const headerToken = req.get('x-csrf-token');
      const csrfCookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
      if (!headerToken || !csrfCookie || headerToken !== csrfCookie) {
        res.status(403).json({ message: 'Invalid or missing CSRF token' });
        return;
      }
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    } catch {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      typeof decoded.id !== 'number' ||
      typeof decoded.roleId !== 'number' ||
      !decoded.lastPermissionUpdate
    ) {
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }

    const currentVersion = await getRolePermissionVersion(decoded.roleId);
    if (currentVersion === null) {
      res
        .status(401)
        .json({ message: 'Role no longer exists. Please login again' });
      return;
    }

    if (
      new Date(currentVersion).getTime() >
      new Date(decoded.lastPermissionUpdate).getTime()
    ) {
      res
        .status(403)
        .json({ message: 'Permissions updated. Please login again' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
