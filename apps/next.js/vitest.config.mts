import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // 배열 형태 — 문자열 키 '@design-system/ui'는 접두어로 맞아 '@design-system/ui/css'까지
    // 삼키므로, 패키지 루트는 정확히 일치하는 정규식으로 건다.
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      {
        find: '@test',
        replacement: path.resolve(import.meta.dirname, './test'),
      },
      {
        find: /^@design-system\/ui$/,
        replacement: path.resolve(
          import.meta.dirname,
          './test/__mocks__/designSystemMock.tsx',
        ),
      },
      {
        find: '@design-system/ui/css',
        replacement: path.resolve(
          import.meta.dirname,
          './test/__mocks__/cssMock.ts',
        ),
      },
      {
        find: 'next/link',
        replacement: path.resolve(
          import.meta.dirname,
          './test/__mocks__/nextLinkMock.tsx',
        ),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
