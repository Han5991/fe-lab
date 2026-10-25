import { cva } from '@blog/styled-system/css';
import { forcedColorsEdge } from './forcedColorsEdge';
import { pressButton } from './interaction';

/**
 * 글자가 있는 행동 버튼·버튼 모양 링크 — Astryx Button(pill, 라벨 14/20 500)의 블로그 판.
 * 홈 히어로·섹션 머리의 "더 보기", 에러 화면과 404가 쓴다.
 *
 * - tone `solid` — 주 행동. 잉크 면(accent.solid)에 지면색 글자. Astryx primary.
 * - tone `neutral` — 보조 행동. paper.200 면에 본문 잉크. Astryx secondary.
 * - tone `ghost` — 면 없음. hover에 지면 한 단계(paper.100)가 깔린다.
 * - tone `outline` — 면 없이 보이는 hairline(ink.borderStrong)으로 갈리는 보조 행동. hover에 paper.200이
 *   깔린다. 면 있는 버튼(solid·neutral)이 놓이면 안 되는 자리 — 보더가 구분을 맡는 About의 외부 링크,
 *   빈 상태의 "다시 시도"가 쓴다.
 * - size `md` 32 · `lg` 36 — Astryx Button의 두 크기. 좌우 안쪽 여백은 12 · 16.
 *
 * 보이는 보더는 `outline`에만 있다(Astryx Button은 보더가 없다). 나머지는 강제 색상 모드용 투명 hairline을
 * `forcedColorsEdge`가 주고, `outline`은 그 선의 색만 바꾼다. 누름은 `pressButton`이 준다(`interaction.ts`).
 */
export const actionButton = cva({
  base: {
    ...pressButton,
    ...forcedColorsEdge,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    rounded: 'full',
    textStyle: 'label',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    textDecorationLine: 'none',
  },
  variants: {
    tone: {
      solid: {
        bg: 'accent.solid',
        color: 'accent.onSolid',
        _hover: { bg: 'accent.solidHover' },
      },
      neutral: {
        bg: 'paper.200',
        color: 'ink.950',
        _hover: { bg: 'paper.300' },
      },
      ghost: {
        bg: 'transparent',
        color: 'ink.950',
        _hover: { bg: 'paper.100' },
      },
      outline: {
        bg: 'transparent',
        color: 'ink.950',
        borderColor: 'ink.borderStrong',
        _hover: { bg: 'paper.200' },
      },
    },
    size: {
      md: { h: '8', px: '3' },
      lg: { h: '9', px: '4' },
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});
