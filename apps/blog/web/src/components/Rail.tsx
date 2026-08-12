import { css, cx } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';

/**
 * 레이아웃 그리드의 단일 출처.
 *
 * 이 사이트의 그리드는 두 값으로만 정의된다.
 *
 *   거터(gutter) — 화면 좌우 여백. 모바일 20px · md(768px) 이상 32px.
 *   레일(rail)   — 콘텐츠 칼럼의 폭. wide 1200 / text 680 / form 400.
 *
 * **거터는 언제나 레일 바깥에 있다.** 그래서 `railText`를 쓴 화면의 글줄은
 * 어느 페이지에서나 정확히 680px이고, 좁은 화면에서는 레일이 알아서
 * `viewport - 거터×2`로 줄어든다. 거터를 레일 안쪽에 주면(`maxW`와 `px`를
 * 같은 요소에) 같은 토큰을 쓰고도 실제 폭이 페이지마다 달라진다 — 정리 전
 * 홈(640)과 /series(576)가 정확히 그 상태였다.
 *
 * 새 페이지를 만들 때 `maxW`와 `px`를 직접 쓰지 말고 이 모듈을 거친다.
 * 레일이 아닌 폭(카드 안쪽 패딩, 문단 최대 폭 등)은 그대로 `css()`를 쓴다.
 */

export type RailWidth = 'wide' | 'text' | 'form';

/** 레일 바깥 거터. 레일을 감싸는 요소에 붙인다. */
export const railGutter = css({ px: { base: '5', md: '8' } });

/**
 * Panda는 `css()`를 정적으로 추출하므로 폭을 변수로 넘길 수 없다.
 * 세 클래스를 미리 만들어 두고 고른다.
 */
const railColumns = {
  wide: css({ maxW: 'railWide', mx: 'auto' }),
  text: css({ maxW: 'railText', mx: 'auto' }),
  form: css({ maxW: 'railForm', mx: 'auto' }),
} as const;

/** 레일 자체(폭 + 가운데 정렬). 거터를 준 요소의 **자식**에 붙인다. */
export const railColumn = (width: RailWidth) => railColumns[width];

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
 */
export const Rail = ({ width = 'text', className, children }: RailProps) => (
  <div className={railGutter}>
    <div className={cx(railColumn(width), className)}>{children}</div>
  </div>
);
