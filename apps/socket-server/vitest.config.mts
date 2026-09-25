import { defineConfig } from 'vitest/config';

// tsc가 테스트도 dist/로 내보내므로 src만 본다
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
