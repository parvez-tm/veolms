import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Shared Redis client used for caching role permission data so the auth
 * middleware does not hit Postgres on every authenticated request.
 */
export const redis = new Redis(env.redis.url, {
  maxRetriesPerRequest: 2,
  // Surface connection problems instead of buffering commands forever.
  enableOfflineQueue: true,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));
