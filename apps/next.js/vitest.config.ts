import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
      '@design-system/ui': path.resolve(
        __dirname,
        './test/__mocks__/designSystemMock.js',
      ),
      '@design-system/ui-lib/css': path.resolve(
        __dirname,
        './test/__mocks__/cssMock.js',
      ),
      'next/link': path.resolve(__dirname, './test/__mocks__/nextLinkMock.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
