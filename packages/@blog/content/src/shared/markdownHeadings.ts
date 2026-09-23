/**
 * 본문 헤딩 강등 매핑.
 *
 * 페이지의 h1은 PostHeader가 그리는 글 제목 하나뿐이어야 하므로 본문 마크다운의
 * `#`(h1)은 h2로 강등한다. 왜 한 단계만이고 전체를 밀지 않는지는
 * `src/components/post/markdownHeadings.tsx`의 주석 참고.
 *
 * 컴포넌트는 앱이 만든다(`src/components/post/markdownHeadings.tsx`). RSS가 본문
 * 전문을 싣던 동안에는 피드 렌더러도 이 매핑을 읽어, 사이트와 피드의 강등이
 * 어긋나지 않게 하는 단일 출처였다. 피드가 요약만 싣게 된 지금 소비처는 앱 하나다.
 */
export const HEADING_TAG_MAP = {
  h1: 'h2',
} as const satisfies Record<string, string>;
