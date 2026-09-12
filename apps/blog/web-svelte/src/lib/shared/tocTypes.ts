/**
 * 차례 항목. 서버(`lib/server/markdown/toc.ts`)가 만들고 화면이 받는다.
 * 두 층이 `lib/server/` 경계를 사이에 두고 있어 타입만 여기 둔다.
 */
export interface TocItem {
  id: string;
  text: string;
  /** 2·3·4 — 원고의 h1은 렌더 시 h2로 강등되므로 1은 나오지 않는다. */
  level: number;
}
