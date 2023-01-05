/// <reference types="vitest" />
// Vitest doesn't let this be actual node ESM
// This is the fake TS-Node, but still actually CJS
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    root: __dirname,
    testTimeout: 380_000,
    // https://vitest.dev/config/#configuration
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
