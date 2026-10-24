import { cva } from '@blog/styled-system/css';
import { forcedColorsEdge } from './forcedColorsEdge';
import { pressable } from './pressable';

/**
 * 글자가 있는 행동 버튼·버튼 모양 링크 — Astryx Button(pill, 라벨 14/20 500)의 블로그 판.
 * 홈 히어로·섹션 머리의 "더 보기", 에러 화면과 404가 쓴다.
 *
 * - tone `solid` — 주 행동. 잉크 면(accent.solid)에 지면색 글자. Astryx primary.
 * - tone `neutral` — 보조 행동. paper.200 면에 본문 잉크. Astryx secondary.
 * - tone `ghost` — 면 없음. hover에 지면 한 단계(paper.100)가 깔린다.
 * - size `md` 32 · `lg` 36 — Astryx Button의 두 크기. 좌우 안쪽 여백은 12 · 16.
 *
 * 보이는 보더는 없다(Astryx Button). 강제 색상 모드용 투명 hairline은 `forcedColorsEdge`가 준다.
 */
export const actionButton = cva({
  base: {
    ...pressable,
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
    },
    size: {
      md: { h: '8', px: '3' },
      lg: { h: '9', px: '4' },
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});
