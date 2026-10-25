import type { CSSProperties } from 'react';

/**
 * 사이트 헤더가 화면 위에서 차지하는 높이(px) — Astryx TopNav의 48(32px 컨트롤 + 위아래 8).
 * 헤더에 아래 구분선이 없어 이 값이 곧 헤더 상자다. 헤더 자신의 높이와 헤더 바로 아래에 붙는
 * 것들(PreviewBanner·ReadingProgress의 top, 차례의 sticky top과 최대 높이, 문장
 * 링크 버튼의 상한, 헤딩 이동 오프셋)이 모두 이 값에서 나온다. 서버 컴포넌트도 읽도록
 * 'use client' 없는 모듈에 둔다.
 */
export const SITE_HEADER_HEIGHT = 48;

/**
 * `css()`는 정적 추출이라 JS 상수를 CSS 변수로 실어 보낸다 — 쓰는 요소가 직접 달아서,
 * 조상이 변수를 주는지에 기대지 않는다.
 */
export const siteHeaderStyle: CSSProperties & Record<`--${string}`, string> = {
  '--site-header-height': `${SITE_HEADER_HEIGHT}px`,
};
