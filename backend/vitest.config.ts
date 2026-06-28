import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the backend's pure, security-critical logic (payment + webhook
 * signature verification, pricing rules, input validation, search-filter
 * whitelisting, HLS tickets). These run without Postgres/Redis/R2 so they're
 * safe in CI. Integration tests that hit the DB are out of scope here (they need
 * a throwaway Postgres); see backend/README.md.
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
  },
});
