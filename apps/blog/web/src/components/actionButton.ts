import { cva } from '@blog/styled-system/css';
import { pressable } from './pressable';

/**
 * 글자가 있는 행동 버튼·버튼 모양 링크 — Astryx Button(pill, 라벨 14/20 500)의 블로그 판.
 * 에러 화면과 404가 쓴다.
 *
 * - tone `solid` — 주 행동. 잉크 면(accent.solid)에 지면색 글자. Astryx primary.
 * - tone `neutral` — 보조 행동. paper.200 면에 본문 잉크. Astryx secondary.
 * - tone `ghost` — 면 없음. hover에 지면 한 단계(paper.100)가 깔린다.
 * - size `md` 32 · `lg` 36 — Astryx Button의 두 크기. 좌우 안쪽 여백은 12 · 16.
 *
 * 보이는 보더는 없다(Astryx Button). **투명 hairline**은 강제 색상 모드(Windows 고대비)용이다 — 그
 * 모드는 면을 지우고 보더만 시스템 색으로 칠하므로, 면으로만 갈리던 버튼이 맨 글자(링크처럼 보인다)로
 * 남지 않는다. 높이(`h`)가 보더를 포함하므로 크기는 그대로다.
 */
export const actionButton = cva({
  base: {
    ...pressable,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    borderColor: 'transparent',
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
