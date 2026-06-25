import { redis } from '../db/redis';
import { env } from '../config/env';
import { PermissionMap } from '../types/interface';
import { Role } from '../routes/control/role/role-model';

const versionKey = (roleId: number) => `role:${roleId}:permVersion`;
const mapKey = (roleId: number) => `role:${roleId}:permMap`;

/**
 * Current permission version (ISO timestamp of the role's lastPermissionUpdate).
 * Served from Redis; on a miss OR a Redis outage it falls back to Postgres (the
 * source of truth) so authentication keeps working if the cache is unavailable.
 * Returns null when the role no longer exists.
 */
export async function getRolePermissionVersion(
  roleId: number
): Promise<string | null> {
  try {
    const cached = await redis.get(versionKey(roleId));
    if (cached !== null) return cached;
  } catch (err) {
    console.warn(
      'Redis unavailable (permission version); using DB:',
      (err as Error).message
    );
  }

  const role = await Role.findByPk(roleId, {
    attributes: ['id', 'lastPermissionUpdate'],
  });
  if (!role) return null;

  const version = role.lastPermissionUpdate.toISOString();
  await safeSet(versionKey(roleId), version);
  return version;
}

/** Read a cached login permission map for a role; null on miss or outage. */
export async function getRolePermissionMap(
  roleId: number
): Promise<PermissionMap[] | null> {
  try {
    const cached = await redis.get(mapKey(roleId));
    return cached ? (JSON.parse(cached) as PermissionMap[]) : null;
  } catch (err) {
    console.warn('Redis unavailable (permission map):', (err as Error).message);
    return null;
  }
}

/** Cache the login permission map for a role (best-effort). */
export async function setRolePermissionMap(
  roleId: number,
  map: PermissionMap[]
): Promise<void> {
  await safeSet(mapKey(roleId), JSON.stringify(map));
}

/**
 * Invalidate cached permission data for a role after its permissions change.
 * Deletes both keys; the next read repopulates the version from Postgres and the
 * map is rebuilt at next login, so there is never a stale cached value.
 */
export async function invalidateRolePermissions(roleId: number): Promise<void> {
  try {
    await redis.del(versionKey(roleId), mapKey(roleId));
  } catch (err) {
    console.warn(
      'Redis unavailable (invalidate permissions):',
      (err as Error).message
    );
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await redis.set(key, value, 'EX', env.redis.permissionTtlSeconds);
  } catch (err) {
    console.warn('Redis write skipped:', (err as Error).message);
  }
}
