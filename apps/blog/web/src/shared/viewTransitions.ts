import { POSTS_PATH } from '@blog/content/client';
import { HOME_PATH } from './routes';

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
  /**
   * 방향 있는 이동(`NAV_TRANSITION`)의 keyframes — 나가는 페이지는 투명해지며 한쪽으로 밀려나고
   * (`navSlideOut`), 들어오는 페이지는 반대쪽에서 밀려 들어온다(`navSlideIn`). 어느 쪽인지는
   * keyframes가 아니라 `panda.config.ts`가 의사 요소마다 주는 거리 변수의 부호다.
   */
  navSlideOut: 'nav-slide-out',
  navSlideIn: 'nav-slide-in',
} as const;

/**
 * 방향 있는 이동의 transition type(Next `<Link transitionTypes>`)이자, 그 type일 때 `PageBoundary`가
 * 나가는·들어오는 페이지에 붙이는 클래스. 나가는 쪽인지 들어오는 쪽인지는 CSS의
 * `::view-transition-old`·`-new`가 가르므로 클래스는 type과 같은 이름 하나다.
 *
 * - `forward` — 앱의 계층에서 더 깊이 들어간다(홈 → 글 목록, 목록 → 글, 다음 글). 내용이 왼쪽으로
 *   밀리고 새 내용이 오른쪽에서 들어온다
 * - `back` — 위로 돌아온다(글 → 글 목록·홈, 이전 글). 반대 방향
 *
 * 링크마다 손으로 달지 않는다 — `navTransitionType`이 출발·도착 경로로 고르고, 링크는
 * `TransitionLink`(`src/components/shared/TransitionLink.tsx`)로 그 결과를 단다.
 */
export const NAV_TRANSITION = {
  forward: 'nav-forward',
  back: 'nav-back',
} as const;

export type NavTransitionType =
  (typeof NAV_TRANSITION)[keyof typeof NAV_TRANSITION];

/**
 * 같은 깊이의 형제 사이에서만 쓰는 순서 — 글 하단의 이전·다음 글. 화살표 방향(← 이전, 다음 →)과
 * 같은 쪽으로 움직인다.
 */
const SIBLING_TRANSITION = {
  prev: NAV_TRANSITION.back,
  next: NAV_TRANSITION.forward,
} as const;

export type SiblingOrder = keyof typeof SIBLING_TRANSITION;

/** href에서 경로만 — 쿼리(`/posts/?tag=…`)와 해시는 깊이와 상관없다. */
const pathOf = (href: string): string => {
  const end = href.search(/[?#]/);
  return end === -1 ? href : href.slice(0, end);
};

/**
 * 앱의 계층에서 경로의 깊이 — 홈 0, 섹션(글 목록·시리즈·소개·정책) 1, 글 2.
 *
 * 경로 세그먼트 수가 아니다: 폴더 slug(`react/component/toast`)도 글 하나이고, 이전·다음 글이 서로
 * 다른 깊이로 보이면 형제 사이가 앞뒤로 갈린다. `POSTS_PATH` 아래(목록 자신 제외)는 전부 글이다.
 * 후행 슬래시가 없는 경로(dev 서버는 `/posts`도 그대로 서빙한다)도 같은 깊이다.
 */
export const navDepth = (pathname: string): number => {
  const path = pathOf(pathname);
  if (path === HOME_PATH) return 0;
  return path !== POSTS_PATH && path.startsWith(POSTS_PATH) ? 2 : 1;
};

/**
 * 출발 경로에서 도착 href로 가는 링크 이동의 방향 — 깊이가 다르면 깊이가 정하고(더 깊으면
 * `forward`), 같으면 형제 순서(`order`)가 있을 때만 그 순서가 정한다. 둘 다 아니면 `null` — type
 * 없이 기본 페이드다(헤더 내비의 형제 이동 `/posts` ↔ `/series` ↔ `/about`, 섹션 → 필터된 목록
 * `/series` → `archivePath`). `/posts` 안에서 필터를 바꾸는 것은 쿼리만 바꾸는 얕은 갱신이라
 * 내비게이션이 아니고 전환도 없다.
 *
 * 깊이가 순서보다 먼저다: 시리즈 마지막 편의 "시리즈 목록 →"은 화살표가 오른쪽이어도 글 → `/series`라
 * 헤더 '시리즈'와 같은 `back`이다 — 방향은 링크가 아니라 이동(출발·도착)의 성질이다.
 */
export const navTransitionType = (
  from: string,
  to: string,
  order?: SiblingOrder,
): NavTransitionType | null => {
  const depthDelta = navDepth(to) - navDepth(from);
  if (depthDelta > 0) return NAV_TRANSITION.forward;
  if (depthDelta < 0) return NAV_TRANSITION.back;
  return order === undefined ? null : SIBLING_TRANSITION[order];
};

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
 * 링크만 단다(`<TransitionLink opensPost>` — 방향 `nav-forward`와 함께 간다). 목록 쪽 공유 요소는
 * 이 type이 있을 때(그 카드를 눌러 글을 열 때)나 그 글의 상세에서 떠나 올 때만 짝이 된다 — 아니면
 * 목록 → 목록 이동(홈 → /posts)에서 같은 글의 카드끼리 짝이 돼 화면의 카드가 전부 날아다닌다.
 */
export const POST_OPEN_TRANSITION_TYPE = 'post-open';

interface LinkTransitionOptions {
  /** 같은 깊이 형제 사이의 순서 — 글 하단의 이전·다음 글만 준다. */
  order?: SiblingOrder | undefined;
  /** 글 카드·목록 행의 제목 링크 — 그 카드의 공유 요소가 글 상세로 이어진다. */
  opensPost?: boolean | undefined;
}

/**
 * 링크 이동 하나가 다는 transition type 전부 — 글을 여는 카드면 `POST_OPEN_TRANSITION_TYPE`,
 * 그리고 출발·도착 경로의 방향(`navTransitionType`). `TransitionLink`가 현재 경로를 넣어 부른다.
 */
export const linkTransitionTypes = (
  from: string,
  to: string,
  { order, opensPost = false }: LinkTransitionOptions = {},
): string[] => {
  const direction = navTransitionType(from, to, order);
  return [
    ...(opensPost ? [POST_OPEN_TRANSITION_TYPE] : []),
    ...(direction === null ? [] : [direction]),
  ];
};

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
