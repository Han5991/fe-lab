import { defineConfig } from 'vite';
import pandacss from '@pandacss/vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import 'vitest/config';

export default defineConfig({
  // Panda는 Vite 플러그인으로 돈다(get-started/vite) — 프레임워크 플러그인보다 앞에 둔다.
  plugins: [pandacss(), tsconfigPaths(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    server: {
      deps: {
        inline: ['@design-system/ui'],
      },
    },
  },
});
