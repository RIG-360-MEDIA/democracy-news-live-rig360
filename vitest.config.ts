import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'test/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/unit/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/app/api/**'],
      reporter: ['text-summary', 'json-summary'],
    },
  },
});
