/**
 * 본문 헤딩 강등 매핑 — **사이트 본문과 RSS 피드가 공유하는 단일 출처**.
 *
 * 페이지의 h1은 PostHeader가 그리는 글 제목 하나뿐이어야 하므로 본문 마크다운의
 * `#`(h1)은 h2로 강등한다. 왜 한 단계만이고 전체를 밀지 않는지는
 * `src/components/post/markdownHeadings.tsx`의 주석 참고.
 *
 * React 컴포넌트는 레이어마다 자기 것을 만든다 — 사이트 본문은
 * `src/components/post/markdownHeadings.tsx`(app), RSS `content:encoded`는
 * `scripts/render/feedRenderer.ts`(render-build). 둘 다 **이 매핑에서 태그를
 * 읽으므로** 한쪽만 바뀌는 회귀가 구조적으로 불가능하다. (예전에는 rss가 app의
 * 컴포넌트를 직접 import해 레이어 경계에 예외가 필요했다.)
 */
export const HEADING_TAG_MAP = {
  h1: 'h2',
} as const satisfies Record<string, string>;
