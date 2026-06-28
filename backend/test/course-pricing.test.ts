import { describe, it, expect } from 'vitest';
import {
  isFreeCourse,
  validateCoursePrice,
  MIN_PAID_PRICE,
} from '../src/routes/lms/course/course-pricing';

describe('course pricing', () => {
  it('treats only an exact 0 as free (fails closed)', () => {
    expect(isFreeCourse(0)).toBe(true);
    expect(isFreeCourse(100)).toBe(false);
    expect(isFreeCourse(-1)).toBe(false);
    expect(isFreeCourse(NaN)).toBe(false);
  });

  it('allows free (0) and prices at/above the gateway minimum', () => {
    expect(validateCoursePrice(0)).toBe(0);
    expect(validateCoursePrice(MIN_PAID_PRICE)).toBe(MIN_PAID_PRICE);
    expect(validateCoursePrice(49900)).toBe(49900);
  });

  it('rejects a positive price below the gateway minimum', () => {
    expect(() => validateCoursePrice(50)).toThrow();
  });

  it('rejects non-integer / negative prices', () => {
    expect(() => validateCoursePrice(-100)).toThrow();
    expect(() => validateCoursePrice('abc')).toThrow();
    expect(() => validateCoursePrice(10.5)).toThrow();
  });
});
