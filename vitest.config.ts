import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps jsx: 'preserve' for Next; tests that render Studio pages (role matrix) need JSX
  // compiled, so the test transform uses React's automatic runtime.
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'test/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    // Cold imports of next/server + route graphs routinely exceed the 5 s default on Windows dev boxes.
    testTimeout: 30_000,
    include: ['src/**/*.test.ts', 'test/unit/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/app/api/**'],
      reporter: ['text-summary', 'json-summary'],
    },
  },
});
