import { SITE_HEADER_HEIGHT } from '../siteHeader';

/**
 * 헤딩으로 이동했을 때 화면 위에서 헤딩까지의 거리 — 고정 헤더 높이에 헤딩 위 여유를 더한다.
 * 헤딩의 `scroll-margin-top`(PostBody)과 목차 활성 판정(useTocHook)이 같은 값을 써야 이동
 * 직후의 헤딩이 "보이는 곳"이 된다. 서버 컴포넌트도 값을 읽도록 'use client' 없는 모듈에 둔다.
 */
export const HEADER_OFFSET = SITE_HEADER_HEIGHT + 47;
