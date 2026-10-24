/**
 * 페이지 전환(View Transitions) 이름의 **단일 출처**.
 *
 * DOM에 붙는 값(`PageBoundary`의 enter/exit 클래스, 헤더의 `view-transition-name`)과
 * 블로그 설정(`panda.config.ts`)의 `::view-transition-*` 셀렉터·keyframes가 같은 값을 읽는다.
 * 어긋나면 빌드·테스트는 통과하고 브라우저만 진단 없이 기본 크로스페이드로 돌아간다.
 */
export const VIEW_TRANSITION = {
  /** 들어오는 페이지의 클래스이자 keyframes 이름 — 8px 아래에서 떠오르며 나타난다. */
  pageEnter: 'page-enter',
  /** 나가는 페이지의 클래스이자 keyframes 이름 — 제자리에서 사라진다. */
  pageExit: 'page-exit',
  /**
   * sticky 헤더의 `view-transition-name` — 헤더를 따로 떼어 페이지 그룹 위에 그린다(안 그러면
   * 스크롤된 채 떠나는 페이지가 헤더 자리에 덧칠된다). 문서에 하나뿐이어야 한다 — 같은 이름이
   * 둘이면 브라우저가 전환을 통째로 건너뛴다.
   */
  siteHeader: 'site-header',
} as const;
