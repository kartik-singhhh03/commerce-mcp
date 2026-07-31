import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for unit tests of schemas, services, store, and tools.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
