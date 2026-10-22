import type { CSSProperties } from 'react';

/**
 * 사이트 헤더가 화면 위에서 차지하는 높이(px, 하단 hairline 포함). 헤더 자신의 높이와
 * 헤더 바로 아래에 붙는 것들(PreviewBanner·ReadingProgress의 top, 문장 링크 버튼의
 * 상한)이 모두 이 값에서 나온다. 서버 컴포넌트도 읽도록 'use client' 없는 모듈에 둔다.
 */
export const SITE_HEADER_HEIGHT = 53;

/**
 * `css()`는 정적 추출이라 JS 상수를 CSS 변수로 실어 보낸다 — 쓰는 요소가 직접 달아서,
 * 조상이 변수를 주는지에 기대지 않는다.
 */
export const siteHeaderStyle: CSSProperties & Record<`--${string}`, string> = {
  '--site-header-height': `${SITE_HEADER_HEIGHT}px`,
};
