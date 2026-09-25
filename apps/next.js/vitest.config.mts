import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@test': path.resolve(import.meta.dirname, './test'),
      '@design-system/ui': path.resolve(
        import.meta.dirname,
        './test/__mocks__/designSystemMock.tsx',
      ),
      '@design-system/ui-lib/css': path.resolve(
        import.meta.dirname,
        './test/__mocks__/cssMock.ts',
      ),
      'next/link': path.resolve(
        import.meta.dirname,
        './test/__mocks__/nextLinkMock.tsx',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
