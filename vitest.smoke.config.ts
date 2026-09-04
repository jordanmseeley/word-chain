import { defineConfig } from 'vitest/config';

/** Browser smoke test. Run separately from unit tests: it needs `npm run build` first. */
export default defineConfig({
  test: {
    include: ['scripts/smoke.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 90_000,
    fileParallelism: false,
  },
});
