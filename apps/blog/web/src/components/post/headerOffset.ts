/**
 * 고정 헤더가 덮는 높이 — 헤딩의 `scroll-margin-top`(PostBody)과 목차 활성 판정
 * (useTocHook)이 같은 값을 써야 이동 직후의 헤딩이 "보이는 곳"이 된다. 서버 컴포넌트도
 * 값을 읽도록 'use client' 없는 모듈에 둔다.
 */
export const HEADER_OFFSET = 100;
