import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const clientEntry = fileURLToPath(new URL('../../packages/client-stellar/src/index.ts', import.meta.url));
const middlewareEntry = fileURLToPath(new URL('../../packages/middleware-resource-stellar/src/index.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@stellar-x402/client-stellar': clientEntry,
      '@stellar-x402/middleware-resource-stellar': middlewareEntry
    }
  },
  test: {
    environment: 'node',
    globals: true
  }
});

