import { describe, it, expect } from 'vitest';
import { Op } from 'sequelize';
import { parseSearchFilters } from '../src/helpers/filters';

describe('search filter whitelisting', () => {
  const searchable = new Set(['title', 'description']);

  it('only builds ILIKE conditions for whitelisted text columns', () => {
    const where = parseSearchFilters(
      { title: 'react', nope: 'x', description: 'hooks' },
      searchable
    ) as Record<string, { [k: symbol]: string }>;
    expect('title' in where).toBe(true);
    expect('description' in where).toBe(true);
    expect('nope' in where).toBe(false);
    expect(where.title[Op.iLike as unknown as symbol]).toBe('%react%');
  });

  it('ignores empty/blank values and non-object input', () => {
    expect(parseSearchFilters({ title: '   ' }, searchable)).toEqual({});
    expect(parseSearchFilters(undefined, searchable)).toEqual({});
    // a stray non-object (e.g. a raw string) must not throw and yields no filter
    expect(parseSearchFilters('react' as unknown as undefined, searchable)).toEqual({});
  });
});
