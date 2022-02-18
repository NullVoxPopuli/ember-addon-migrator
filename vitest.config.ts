/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    testTimeout: 380_000,
    // https://vitest.dev/config/#configuration
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
