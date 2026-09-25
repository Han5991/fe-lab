import { defineConfig } from 'vitest/config';

/**
 * `build`(tsc)가 테스트 파일까지 dist/로 내보내므로 src만 본다 — 안 그러면 빌드 뒤에
 * 컴파일된 사본이 한 번 더 돈다.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
