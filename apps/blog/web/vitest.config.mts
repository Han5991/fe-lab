import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * 러너는 vitest 하나이고, **환경**만 두 프로젝트로 나눈다.
 *
 * - `node`: src/{shared,domain,lib}/ 의 순수 로직·와이어 계약. jsdom을 띄우지
 *   않는다 — 이 앱에서 jsdom 부팅은 파일당 1초 안팎이라(전체 환경 셋업 40초대)
 *   DOM이 필요 없는 테스트까지 태우면 그대로 낭비다.
 * - `jsdom`: 나머지 src/(app 레이어)의 컴포넌트·훅. RTL·jest-dom 매처와
 *   next.config 미러링 셋업(vitest.setup.ts)이 여기에만 붙는다. 레이어 세 폴더는
 *   node 프로젝트 소속이므로 exclude로 겹침을 끊는다.
 *
 * 예전에는 이 경계가 러너 경계(node --test vs vitest)였다. 러너가 갈리면
 * 단언 API·커버리지 도구·lint 인가가 두 벌이 되고, `node --test`는 글롭이
 * 0개를 매칭해도 exit 0이라 테스트가 조용히 사라질 수 있었다. 지금은 같은
 * 러너 안의 프로젝트 경계라 그 비용 없이 환경만 분리된다.
 *
 * include는 tsconfig.test.json·eslint의 테스트 블록과 대칭이다 — 한쪽을 고치면 셋을 함께.
 */

// tsconfig의 `@/* → ./*` 매핑을 vitest에도 동일 적용하는 프리픽스 alias.
// (키에 트레일링 슬래시를 둬 `@/foo`만 매칭하고 `@/`가 아닌 경로엔 닿지 않게 함)
const alias = { '@/': fileURLToPath(new URL('./', import.meta.url)) };

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.config.*',
        '**/database.types.ts',
        '**/index.ts',
      ],
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'src/shared/**/*.{test,spec}.ts',
            'src/domain/**/*.{test,spec}.ts',
            'src/lib/**/*.{test,spec}.ts',
          ],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          // 레이어 세 폴더는 node 프로젝트가 돌린다 — 여기서 겹치면 같은
          // 테스트가 두 번(그중 한 번은 불필요한 jsdom 위에서) 돈다.
          exclude: [...configDefaults.exclude, 'src/{shared,domain,lib}/**'],
        },
      },
    ],
  },
});
