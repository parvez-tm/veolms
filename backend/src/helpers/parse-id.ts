import { ApiError } from '../types/interface';

const INT4_MAX = 2147483647;

/** Validate a route param as a positive integer id, or throw a 400. */
export function parseId(value: string, name = 'id'): number {
  if (!/^\d+$/.test(value)) {
    throw new ApiError(400, `Invalid ${name}`);
  }
  return Number(value);
}

interface IntOptions {
  min?: number;
  max?: number;
}

/**
 * Coerce an unknown body value to an integer, throwing a 400 (not a DB 500) for
 * non-numeric or out-of-range input before it reaches a Postgres numeric column.
 */
export function toInt(value: unknown, name = 'value', opts: IntOptions = {}): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n)) {
    throw new ApiError(400, `Invalid ${name}`);
  }
  if (opts.min !== undefined && n < opts.min) {
    throw new ApiError(400, `${name} must be >= ${opts.min}`);
  }
  if (opts.max !== undefined && n > opts.max) {
    throw new ApiError(400, `${name} must be <= ${opts.max}`);
  }
  return n;
}

/** Integer id from a body field (positive, within int8 safe range). */
export function bodyId(value: unknown, name = 'id'): number {
  return toInt(value, name, { min: 1, max: Number.MAX_SAFE_INTEGER });
}

/** Non-negative int4 value (for counts/positions/durations). */
export function nonNegInt(value: unknown, name = 'value'): number {
  return toInt(value, name, { min: 0, max: INT4_MAX });
}
