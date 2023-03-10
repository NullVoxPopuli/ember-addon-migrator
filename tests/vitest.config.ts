/// <reference types="vitest" />
// Vitest doesn't let this be actual node ESM
// This is the fake TS-Node, but still actually CJS
import os from 'node:os';
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    root: __dirname,
    maxThreads: Math.ceil(os.cpus().length / 2),
    testTimeout: 380_000,
    hookTimeout: 380_000,
    // https://vitest.dev/config/#configuration
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      include: ['../cli/**/*.js'],
    },
  },
});
