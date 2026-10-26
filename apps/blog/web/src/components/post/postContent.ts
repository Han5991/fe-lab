/**
 * 글 본문의 DOM 계약 — PostBody가 `id`를 달고, 차례(`useTocHook`)·글 상세 셸(`railWithAside`)·문장 공유
 * (`QuoteLink`)가 읽는다. 값은 e2e와 단위 테스트가 리터럴(`#post-content`)로 따로 잠근다.
 * 서버 컴포넌트도 값을 읽도록 'use client' 없는 모듈에 둔다. 값은 리터럴이어야 한다 — Panda가
 * `railWithAside`의 `css()` 키에서 정적으로 읽고, 리터럴이 아니면 Rail.tsx가 check-types에서 막힌다.
 */
export const POST_CONTENT_ID = 'post-content';

/** 차례가 모으는 헤딩. 이 헤딩이 하나도 없는 글은 `railWithAside`가 차례 칸을 접는다. */
export const TOC_HEADING_SELECTOR = 'h1, h2, h3, h4';
