import { defineConfig } from 'vitest/config';

/**
 * 순수 계층만 본다 — **node 환경**이다.
 *
 * 두 갈래다. 서버 쪽(`lib/server`)은 커스텀 태그가 빌드 타임에 HAST로 다시
 * 쓰이므로(그 이유는 `customTags.ts` 주석) 검증 대상이 컴포넌트가 아니라
 * **문자열 → HTML** 순수 변환이다. 클라이언트 쪽(`lib/client`)은 화면에서
 * 떼어 둔 규칙 모듈(검색 필터·하이라이트·최근 목록 파싱)이고, 역시 DOM이
 * 필요 없다. `.svelte` 파일은 여기서 보지 않는다 — 컴포넌트 렌더러를 들이면
 * 이 앱의 테스트가 계약 검증에서 UI 스냅샷으로 성격이 바뀐다.
 *
 * SvelteKit 플러그인을 넣지 않는다 — `$lib` 별칭을 쓰는 화면 코드는 여기서
 * 보지 않고, 플러그인을 끼우면 테스트가 라우팅·프리렌더까지 끌어온다.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/server/**/*.test.ts', 'src/lib/client/**/*.test.ts'],
  },
});
