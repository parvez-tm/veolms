import type { RoleName } from '@/types'

/**
 * Decode a JWT payload WITHOUT verifying its signature. This is only used
 * client-side to read non-sensitive claims like `exp`; the server is always the
 * real authority (every request is independently authorized).
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '==='.slice((base64.length + 3) % 4)
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * A token is usable when it exists, is well-formed, and (if it carries an `exp`
 * claim) hasn't expired. We treat a missing/garbage token as logged-out so the
 * app never renders an authenticated UI backed by a dead token.
 */
export function isTokenValid(token: string | null | undefined): boolean {
  if (!token) return false
  const payload = decodeJwtPayload(token)
  if (!payload) return false
  const { exp } = payload
  if (typeof exp !== 'number') return true
  return exp * 1000 > Date.now()
}

/** The "home base" route for a signed-in user, by role. */
export function dashboardPathFor(role: RoleName | undefined): string {
  return role === 'Admin' || role === 'Instructor' ? '/admin' : '/my-learning'
}

/**
 * A human name for chrome (greeting, avatar). Uses first/last name only and
 * NEVER falls back to the email or username. Returns '' when no name is known,
 * so callers can hide the label rather than expose an email address.
 */
export function userDisplayName(
  user: { firstName?: string | null; lastName?: string | null } | null | undefined
): string {
  if (!user) return ''
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
}
