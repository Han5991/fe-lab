/**
 * 페이지 전환(View Transitions) 이름의 **단일 출처**.
 *
 * DOM에 붙는 값(`PageBoundary`의 enter/exit 클래스, 헤더의 `view-transition-name`, 공유 요소의
 * share 클래스와 이름)과 블로그 설정(`panda.config.ts`)의 `::view-transition-*` 셀렉터·keyframes가
 * 같은 값을 읽는다. 어긋나면 빌드·테스트는 통과하고 브라우저만 진단 없이 기본 크로스페이드로
 * 돌아간다.
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
  /**
   * 공유 요소의 스냅샷이 나타나는 keyframes — 투명도만 0에서 올라온다(자리는 그룹이 옮긴다).
   * 사라지는 스냅샷은 `pageExit` keyframes를 그대로 쓴다(제자리에서 사라지는 같은 움직임).
   */
  sharedFadeIn: 'shared-fade-in',
  /**
   * 커버 짝의 바닥 스냅샷(글 상세 쪽 — 그룹 상자를 cover로 꽉 채운다)의 모서리 keyframes. 상세
   * 끝에서는 히어로의 라운드, 카드 끝에서는 카드 커버의 라운드라 카드 → 상세는 카드의 라운드에서
   * 출발하고(`coverCornerFromCard`) 상세 → 카드는 카드의 라운드로 끝난다(`coverCornerToCard`).
   */
  coverCornerFromCard: 'cover-corner-from-card',
  coverCornerToCard: 'cover-corner-to-card',
} as const;

/**
 * 글 카드에서 글 상세로 이어지는 **공유 요소**(shared element)의 짝. 값은 그 짝의
 * `view-transition-class`(React `<ViewTransition share>`)이자 이름의 접두사다.
 *
 * - `cover` — 카드 커버 ↔ 글 상세 히어로 이미지(`PostHero`의 썸네일. 다이어그램 히어로나
 *   히어로가 없는 글은 짝이 없어 페이드만 한다)
 * - `title` — 카드 제목 ↔ 글 상세 h1(`PostHeader`)
 */
export const POST_SHARED = {
  cover: 'post-cover',
  title: 'post-title',
} as const;

export type PostSharedPart = keyof typeof POST_SHARED;

/**
 * 공유 요소가 있는 쪽 — 글 카드(목록)인가 글 상세인가. 값은 `POST_SHARED`와 함께 붙는 두 번째
 * `view-transition-class`다. 짝의 그룹·old·new는 **들어오는 쪽** 요소의 클래스만 받으므로(Chrome
 * 실측 — 나가는 쪽 클래스는 버려진다), 이 클래스가 곧 전환의 방향이다: `detail`이면 카드 → 상세,
 * `card`면 상세 → 카드.
 */
export const POST_SHARED_SIDE = {
  card: 'post-card',
  detail: 'post-detail',
} as const;

export type PostSharedSide = keyof typeof POST_SHARED_SIDE;

/**
 * 글을 여는 링크 이동의 transition type(Next `<Link transitionTypes>`) — 글 카드·목록 행의 제목
 * 링크만 단다. 목록 쪽 공유 요소는 이 type이 있을 때(그 카드를 눌러 글을 열 때)나 그 글의 상세에서
 * 떠나 올 때만 짝이 된다 — 아니면 목록 → 목록 이동(홈 → /posts)에서 같은 글의 카드끼리 짝이 돼
 * 화면의 카드가 전부 날아다닌다.
 */
export const POST_OPEN_TRANSITION_TYPE = 'post-open';

/** CSS 식별자에 그대로 둘 수 있는 바이트 — 영숫자와 `-`. `_`는 아래 이스케이프의 표지라 뺀다. */
const IDENT_SAFE_BYTE = /^[A-Za-z0-9-]$/;

/**
 * 공유 요소의 `view-transition-name` — 카드와 글 상세가 **이 함수 하나로** 같은 이름을 만들어야
 * 브라우저가 둘을 한 요소로 잇는다.
 *
 * slug는 UTF-8 바이트로 풀어 영숫자·`-`가 아닌 바이트를 `_` + 두 자리 16진수로 바꾼다. 이유:
 *
 * - React는 `CSS.escape(name) !== name`인 이름을 `btoa`로 바꾸는데, `btoa`는 Latin-1 밖의 글자
 *   (한글 slug)에서 throw한다. 결과가 식별자 글자만이면 React가 이름을 손대지 않는다.
 * - `.`(`turborepo-next.js-docker`)·`/`(폴더 slug)는 식별자 글자가 아니다.
 * - `_`도 바꾸므로 이스케이프 결과는 원래 slug로 되돌릴 수 있다 — 서로 다른 slug가 같은 이름이
 *   되지 않는다.
 */
export const postSharedName = (part: PostSharedPart, slug: string): string => {
  let ident = '';
  for (const byte of new TextEncoder().encode(slug)) {
    const char = String.fromCharCode(byte);
    ident += IDENT_SAFE_BYTE.test(char)
      ? char
      : `_${byte.toString(16).padStart(2, '0')}`;
  }
  return `${POST_SHARED[part]}-${ident}`;
};
