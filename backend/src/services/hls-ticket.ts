import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/** Short-lived access window for an HLS playlist/key/segments (seconds). */
export const HLS_TTL_SECONDS = 2 * 60 * 60; // 2 hours

interface HlsTicket {
  assetId: number;
  userId: number;
  t: 'hls';
}

/**
 * Issue a short-lived, asset-scoped ticket after an enrollment check. The player
 * carries it on the playlist + key requests, so those endpoints don't need a JWT
 * header (works with native HLS too) but still can't be reached without it.
 */
export function issueHlsTicket(assetId: number, userId: number): string {
  return jwt.sign({ assetId, userId, t: 'hls' } satisfies HlsTicket, env.jwt.secret, {
    expiresIn: HLS_TTL_SECONDS,
  });
}

/** Verify a ticket is valid, unexpired, and bound to this asset. */
export function verifyHlsTicket(ticket: string, assetId: number): boolean {
  if (!ticket) return false;
  try {
    const p = jwt.verify(ticket, env.jwt.secret) as Partial<HlsTicket>;
    return p?.t === 'hls' && Number(p.assetId) === assetId;
  } catch {
    return false;
  }
}
