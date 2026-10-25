import { cva } from '@blog/styled-system/css';
import { forcedColorsEdge } from './forcedColorsEdge';

/**
 * 태그 배지 — `#태그` 한 개를 담는 20px pill. Astryx Badge(neutral)의 모양이다: `paper.200` 면에
 * 본문 잉크(`ink.950`), `supporting` 500, 좌우 8.
 *
 * 시리즈 배지(`seriesBadge.ts`, `accent.muted` 면 + `accent.solid` 글자)와는 다른 모양이다 — 라이트는
 * 두 면이 거의 같지만 다크에서는 `accent.muted`가 `paper.200`보다 한 단계 밝다(목업의 태그 배지 면이
 * `paper.200`과 같은 값이다).
 *
 * - 기본 — 누를 수 없는 표식. 글 목록 카드의 메타 줄(`PostMeta`의 `badges`)이 쓴다. 카드 안의 태그는
 *   링크가 아니다(카드 링크 안에 링크를 둘 수 없다).
 * - `interactive` — 누르는 배지(필터를 푸는 버튼, 태그 필터로 가는 링크). hover에 면이 한 단계
 *   진해지고(paper.300), 면으로만 갈리는 상자라 칩·버튼과 같은 강제 색상 모드용 투명 hairline을 둔다.
 *
 * 서체는 레시피가 정하지 않는다(`chip.ts`와 같은 규칙) — 카드 메타 줄 안에서는 mono를 물려받는다.
 * 덧씌울 때는 `css(tagBadge.raw(…), {…})`로 병합한다(`cx`는 충돌하는 원자 클래스를 병합하지 않는다).
 */
export const tagBadge = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    h: '5',
    px: '2',
    rounded: 'full',
    textStyle: 'supporting',
    fontWeight: 'medium',
    bg: 'paper.200',
    color: 'ink.950',
    whiteSpace: 'nowrap',
  },
  variants: {
    interactive: {
      true: {
        ...forcedColorsEdge,
        cursor: 'pointer',
        transition: 'colors',
        _hover: { bg: 'paper.300' },
      },
    },
  },
});
