import type { RoleName } from '@/types'

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
