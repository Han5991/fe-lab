import { defineConfig } from 'vitest/config';

/**
 * 이 패키지의 테스트는 전부 node 환경이다 — 로더·스키마·URL 계산·빌드 스크립트라
 * DOM이 없다. 그래서 프로젝트를 나누지 않고 단일 config로 둔다(앱은 `src/`가
 * jsdom을 요구해 projects로 갈린다 — apps/blog/web/vitest.config.mts).
 *
 * include는 tsconfig.test.json·eslint의 테스트 블록과 대칭이다 — 한쪽을 고치면 셋을 함께.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.config.*', '**/index.ts'],
    },
  },
});
