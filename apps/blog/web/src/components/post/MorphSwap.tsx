import type { ReactNode } from 'react';
import { css } from '@blog/styled-system/css';

interface MorphSwapProps {
  /** true면 `after`가, false면 `before`가 보인다. */
  on: boolean;
  before: ReactNode;
  after: ReactNode;
}

/** 나가는 면이 줄어드는 끝값이자 들어오는 면이 자라기 시작하는 값. */
const HIDDEN = { opacity: '0', transform: 'scale(0.75)' } as const;
const SHOWN = { opacity: '1', transform: 'scale(1)' } as const;

const root = css({
  // 두 면을 한 칸에 겹친다 — 상자는 더 큰 면을 따르고, 면이 바뀌어도 레이아웃이 움직이지 않는다.
  display: 'inline-grid',
  '& > *': {
    gridArea: '1 / 1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: 'opacity, transform',
    transitionDuration: 'fast',
    transitionTimingFunction: 'standard',
  },
  '& > :first-child': SHOWN,
  '& > :last-child': HIDDEN,
  '&[data-on] > :first-child': HIDDEN,
  '&[data-on] > :last-child': SHOWN,
});

/**
 * 같은 자리의 두 글리프를 교차시킨다(복사 → 체크). 두 면이 늘 DOM에 있고, 켜고 끄는 건 **루트의
 * `data-on` 하나**다 — 두 레이어의 opacity와 scale(.75 ↔ 1)이 같은 시간(fast)·곡선(standard)으로
 * 양방향을 돈다. 도중에 다시 눌러도 CSS 전환이 현재 값에서 되돌아가므로 JS가 중단을 다루지 않는다.
 * 움직임 줄이기는 fast 토큰이 0.01ms가 되며 끈다.
 *
 * blur는 쓰지 않는다. 합성되지 않아(compositeFailed) 측정에서 이득이 없었다.
 *
 * 두 면은 장식이다 — 상태는 쓰는 쪽 버튼의 접근 가능한 이름이 전한다.
 */
export function MorphSwap({ on, before, after }: MorphSwapProps) {
  return (
    <span className={root} data-on={on ? '' : undefined} aria-hidden>
      <span>{before}</span>
      <span>{after}</span>
    </span>
  );
}
