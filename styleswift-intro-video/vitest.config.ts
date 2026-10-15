import {defineConfig} from 'vitest/config';

// Own config so vitest doesn't pick up the extension's vitest.config.js in the repo root.
export default defineConfig({test: {include: ['src/**/*.test.ts']}});
