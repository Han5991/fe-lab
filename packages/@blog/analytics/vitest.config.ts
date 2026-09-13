import { defineConfig } from 'vitest/config';

/**
 * 순수 계산 + 주입된 클라이언트 — **node 환경**이다.
 *
 * 이 패키지에는 렌더할 것이 없다. 저장소도 supabase 클라이언트를 생성자로
 * 받으므로 가짜를 넘겨 열어 볼 수 있고, jsdom이 필요한 자리는
 * `getAdminPostsIndex`의 `window`·`fetch` 판정뿐이라 테스트가 직접 세운다.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      // 앱에서 옮겨 오면서 이 1,300여 줄이 앱 커버리지 리포트(`src/**`)에서
      // 빠졌다. 임계값은 앱과 마찬가지로 두지 않지만, 리포트에서 사라지는 것과
      // 임계값이 없는 것은 다른 문제다.
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.config.*',
        'src/database.types.ts',
        'src/index.ts',
      ],
    },
  },
});
