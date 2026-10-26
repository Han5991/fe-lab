import { css, cva, cx } from '@blog/styled-system/css';
import type { RecipeVariant } from '@blog/styled-system/css';
import type { ReactNode } from 'react';

import { POST_CONTENT_ID, TOC_HEADING_SELECTOR } from './post/postContent';

/**
 * 레이아웃 그리드의 단일 출처.
 *
 * 이 사이트의 그리드는 두 값으로만 정의된다.
 *
 *   거터(gutter) — 화면 좌우 여백. 모바일 20px · md(768px) 이상 32px.
 *   레일(rail)   — 콘텐츠 칼럼의 폭. wide 1200 / text 752 / form 400.
 *
 * **거터는 언제나 레일 바깥에 있다.** 그래서 `railText`를 쓴 화면의 글줄은
 * 어느 페이지에서나 정확히 752px이고, 좁은 화면에서는 레일이 알아서
 * `viewport - 거터×2`로 줄어든다. 거터를 레일 안쪽에 주면(`maxW`와 `px`를
 * 같은 요소에) 같은 토큰을 쓰고도 실제 폭이 페이지마다 달라진다 — 정리 전
 * 홈(640)과 /series(576)가 정확히 그 상태였다.
 *
 * 새 페이지를 만들 때 `maxW`와 `px`를 직접 쓰지 말고 이 모듈을 거친다.
 * 레일이 아닌 폭(카드 안쪽 패딩, 문단 최대 폭 등)은 그대로 `css()`를 쓴다. 레일 위에 얹는 조합은 이
 * 모듈이 이름을 준다 — 글 상세의 본문 + 차례(`railWithAside`).
 */

/** 레일 바깥 거터. 레일을 감싸는 요소에 붙인다. */
export const railGutter = css({ px: { base: '5', md: '8' } });

/**
 * 레일 자체(폭 + 가운데 정렬). 거터를 준 요소의 **자식**에 붙인다.
 *
 * `css()`는 정적 추출이라 폭을 변수로 넘길 수 없지만, cva는 variant 전부를
 * 빌드 타임에 만들어 두고 선택만 런타임에 하므로 `railColumn({ width })`로
 * 고를 수 있다.
 */
export const railColumn = cva({
  base: { mx: 'auto' },
  variants: {
    width: {
      wide: { maxW: 'railWide' },
      text: { maxW: 'railText' },
      form: { maxW: 'railForm' },
    },
  },
  defaultVariants: { width: 'text' },
});

/**
 * 글 상세의 셸 — wide 레일(`railColumn({ width: 'wide' })`) **안쪽**에 붙인다. 본문 칸(`railText` 752)과
 * 차례 칸(`tocAside` 268)을 간격 32로 나란히 놓고 가운데에 둔다: 752 + 32 + 268 = 1052 ≤ 1200.
 * lg(1024px) 미만은 한 열이고 차례는 `MobileTOC`가 맡는다 — 1024px에서도 차례 칸이 줄지 않고 본문
 * 칸이 줄어든다(`minmax(0, …)`).
 *
 * **본문에 차례 헤딩(`TOC_HEADING_SELECTOR`)이 없는 글은 차례 칸을 잡지 않는다** — 차례(`TOC`)가 아무것도 그리지 않는데 268 + 32가
 * 비어 있으면 본문이 레일 중심에서 왼쪽으로 쏠린다. 판정은 CSS `:has()`가 **서버가 그린 본문 DOM**에서
 * 한다(`TOC`가 읽는 것과 같은 본문 안의 id 있는 헤딩 — 본문 id와 헤딩 선택자는 `post/postContent.ts`의 같은
 * 상수에서 온다). 차례는 하이드레이션 뒤에야 그려지므로
 * 그것을 보면 첫 페인트 뒤에 본문이 움직인다 — 헤딩은 HTML에 이미 있어 첫 페인트부터 맞다. `:has()`를
 * 모르는 브라우저는 이 규칙(선택자 하나가 틀리면 규칙 통째로)을 버리고 두 칸 그대로다: 헤딩 있는 글이
 * 대부분이라 그쪽이 안전한 쪽이다.
 *
 * 폭을 페이지가 직접 적지 않게 조합식을 여기 한 곳에 둔다(AGENTS.md §9). `tocAside`는 레일이 아니라
 * 콘텐츠 제약이라(`blog-preset.ts` sizes 주석) 레일 목록에 들지 않는다.
 */
export const railWithAside = css({
  display: 'grid',
  gridTemplateColumns: {
    base: '[minmax(0, 1fr)]',
    lg: '[minmax(0, token(sizes.railText)) token(sizes.tocAside)]',
  },
  columnGap: { lg: '8' },
  justifyContent: 'center',
  alignItems: 'start',
  lg: {
    [`&:not(:has(#${POST_CONTENT_ID} :is(${TOC_HEADING_SELECTOR})[id]))`]: {
      gridTemplateColumns: '[minmax(0, token(sizes.railText))]',
      columnGap: '0',
    },
  },
});

/**
 * `railWithAside`의 본문 칸. 한 열일 때도(lg 미만) 본문은 `railText`를 넘지 않고 가운데에 서서, 레일이
 * 줄어드는 좁은 화면에서만 칸이 `viewport - 거터×2`가 된다.
 */
export const railAsideMain = css({
  minW: '0',
  w: 'full',
  maxW: 'railText',
  mx: { base: 'auto', lg: '0' },
});

/** 레일 폭 목록은 recipe의 variant 키에서 파생된다 — 따로 관리하지 않는다. */
export type RailWidth = RecipeVariant<typeof railColumn>['width'];

interface RailProps {
  width?: RailWidth;
  /** 레일(안쪽 칼럼)에 얹을 클래스 — `py`, `display: grid` 등이 여기 온다. */
  className?: string;
  children: ReactNode;
}

/**
 * 거터 + 레일 2단 구조를 한 번에 만든다. 바깥 요소에 배경·보더를 깔아야 하는
 * 경우(섹션 배경이 화면 끝까지 가야 할 때)에는 이 컴포넌트 대신
 * `railGutter` / `railColumn()`을 직접 조합한다.
 * 기본 폭(text)은 recipe의 `defaultVariants`가 정한다.
 */
export const Rail = ({ width, className, children }: RailProps) => (
  <div className={railGutter}>
    <div className={cx(railColumn({ width }), className)}>{children}</div>
  </div>
);
