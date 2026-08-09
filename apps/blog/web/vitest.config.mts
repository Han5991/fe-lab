import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * 컴포넌트/훅용 vitest 설정 (jsdom 환경).
 *
 * domain/lib/scripts의 순수 로직 테스트는 기존 `node --test`가 담당하고,
 * vitest는 src/ 의 DOM 의존 컴포넌트·훅 테스트만 맡습니다(include 스코프로 분리).
 * 두 러너는 `pnpm test`에서 순차 실행됩니다.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    // tsconfig의 `@/* → ./*` 매핑을 vitest에도 동일 적용하는 프리픽스 alias.
    // (키에 트레일링 슬래시를 둬 `@/foo`만 매칭하고 `@/`가 아닌 경로엔 닿지 않게 함)
    alias: {
      '@/': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});
