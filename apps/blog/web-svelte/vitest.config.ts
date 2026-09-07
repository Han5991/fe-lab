import { defineConfig } from 'vitest/config';

/**
 * 마크다운 변환 계층만 본다 — **node 환경**이다.
 *
 * 이 앱의 커스텀 태그는 빌드 타임에 HAST로 다시 쓰이므로(그 이유는
 * `customTags.ts` 주석), 검증 대상이 컴포넌트가 아니라 **문자열 → HTML**
 * 순수 변환이다. jsdom도 컴포넌트 렌더러도 필요 없다.
 *
 * SvelteKit 플러그인을 넣지 않는다 — `$lib` 별칭을 쓰는 화면 코드는 여기서
 * 보지 않고, 플러그인을 끼우면 테스트가 라우팅·프리렌더까지 끌어온다.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/server/**/*.test.ts'],
  },
});
