/**
 * admin 화면 안의 View Transitions 이름 — 페이지 전환(`viewTransitions.ts`)과 같은 규칙으로, DOM에
 * 붙는 값(React `<ViewTransition>`의 클래스, 관리자 바의 `view-transition-name`)과 블로그 설정
 * (`panda.config.ts` globalCss의 `::view-transition-*` 셀렉터)이 같은 값을 읽는다. 어긋나면 빌드·테스트는
 * 통과하고 브라우저만 진단 없이 기본 크로스페이드로 돌아간다.
 *
 * 클래스는 무엇이 움직이는지가 아니라 **어떻게 움직이는지**로 이름을 붙였다 — 스켈레톤·패널 내용·지표
 * 값이 같은 퇴장(`out`)을 나눠 쓴다. 나가는 쪽과 들어오는 쪽은 의사 요소(`::view-transition-old`·`-new`)가
 * 가르므로, 들고 나는 것이 같은 움직임이면(시트) 클래스 하나를 enter·exit에 함께 주고, 같은 자리에서
 * 바뀌는 것(update)은 두 클래스를 함께 준다(`out rise`). CSS는 공개 페이지까지 모든 페이지가 받는 한
 * 장이라 규칙 수를 줄이는 쪽이 싸다.
 *
 * 페이지 전환과 파일을 나눈 이유: 이 이름들은 admin 클라이언트 컴포넌트만 연다 — 공개 페이지가 여는
 * 모듈에 두면 admin 이름까지 공개 페이지의 클라이언트 그래프에 실릴 수 있다.
 *
 * 움직임의 시간·곡선과 고른 이유는 globalCss의 admin 블록에 있다.
 */
export const ADMIN_VIEW_TRANSITION = {
  /**
   * 관리자 바의 `view-transition-name` — 사이트 헤더(`VIEW_TRANSITION.siteHeader`)처럼 바를 따로 떼어
   * 페이지·목록 위에 그린다. admin에는 사이트 헤더가 없으므로(`ShellSwitch`) 두 이름이 한 문서에
   * 함께 있는 일은 없다.
   */
  bar: 'admin-bar',
  /** 자리를 넘기고 제자리에서 걷힌다 — 스켈레톤, 바뀌기 전 지표 값. */
  out: 'admin-out',
  /** `out`이 걷힌 뒤 8px 아래에서 떠오른다 — 바뀐 지표 값, 정렬을 바꾼 글 목록. */
  rise: 'admin-rise',
  /** `out`이 걷힌 뒤 오른쪽 16px에서 밀려 온다 — 넓은 화면 글 통계 패널의 새 내용. */
  slideIn: 'admin-slide-in',
  /**
   * 오른쪽으로 16px 밀려 나가며 걷힌다 — 넓은 화면 글 통계 패널의 이전 내용(다른 글로 바꿀 때, 닫을 때).
   * `slideIn`을 거꾸로 돈다.
   */
  slideOut: 'admin-slide-out',
  /** 좁은 화면 글 통계 시트 — 열림·닫힘(sm 미만은 아래, 그 위는 오른쪽 화면 밖과 오간다). */
  sheet: 'admin-sheet',
  /**
   * 넓은 화면 글 통계 칼럼 — 고른 글이 있을 때만 있고, 오른쪽 화면 밖과 오간다. 시트와 달리 열림·닫힘이 같은
   * 곡선(standard)이다 — 옆 목록 칼럼(`resize`)의 상자가 한 그룹 애니메이션이라 방향마다 곡선을 바꿀 수 없어,
   * 칼럼도 같은 곡선으로 맞춰야 둘이 함께 닿는다.
   */
  drawer: 'admin-drawer',
  /**
   * 넓은 화면 분석의 목록 칼럼 — 글 통계 칼럼이 열리고 닫히며 폭이 바뀔 때. 이전 스냅샷은 지우고 새
   * 스냅샷을 늘이지 않은 채 왼쪽 위에 붙여, 칼럼 상자만 글 통계 칼럼(`drawer`)과 같은 시간·곡선으로 줄고 는다.
   */
  resize: 'admin-resize',
  /** 시트 뒤 스크림 — 나타남·사라짐. */
  scrim: 'admin-scrim',
} as const;

/**
 * React transition type(`addTransitionType`) — 같은 transition 안에서도 무엇이 바꿨는지에 따라
 * 움직임을 가른다.
 */
export const ADMIN_TRANSITION_TYPE = {
  /**
   * 글 목록의 정렬 변경. 목록의 `update` 클래스가 이 type일 때만 교차(`out`·`rise`)다 — 글 고르기(주소
   * 변경)도 transition이라 type 없이 두면 줄을 고를 때마다 목록 전체가 교차한다.
   */
  sort: 'admin-sort',
} as const;
