import { describe, it, expect } from 'vitest';
import { parseId, bodyId, nonNegInt, toInt } from '../src/helpers/parse-id';

describe('id / int parsing', () => {
  it('parseId accepts digit strings, rejects the rest', () => {
    expect(parseId('5')).toBe(5);
    expect(() => parseId('abc')).toThrow();
    expect(() => parseId('-3')).toThrow();
    expect(() => parseId('1.5')).toThrow();
  });

  it('bodyId requires a positive integer', () => {
    expect(bodyId(7)).toBe(7);
    expect(bodyId('7')).toBe(7);
    expect(() => bodyId(0)).toThrow();
    expect(() => bodyId(-1)).toThrow();
    expect(() => bodyId('x')).toThrow();
  });

  it('nonNegInt allows 0 and positive, rejects negatives/overflow', () => {
    expect(nonNegInt(0)).toBe(0);
    expect(nonNegInt('42')).toBe(42);
    expect(() => nonNegInt(-1)).toThrow();
    expect(() => nonNegInt(2_147_483_648)).toThrow(); // > INT4_MAX
  });

  it('toInt enforces min/max bounds', () => {
    expect(toInt(5, 'n', { min: 1, max: 10 })).toBe(5);
    expect(() => toInt(0, 'n', { min: 1 })).toThrow();
    expect(() => toInt(11, 'n', { max: 10 })).toThrow();
  });
});
