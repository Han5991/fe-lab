import { cva } from '@blog/styled-system/css';
import { forcedColorsEdge } from './forcedColorsEdge';

/**
 * 칩 — 한 줄에 여럿이 줄바꿈되며 놓이는 32px pill. Astryx ToggleButton 칩(ghost md)의 모양이고,
 * 홈 오픈소스 줄이 쓴다.
 *
 * - tone `neutral` — paper.200 면에 본문 잉크. 링크 칩이라 hover에 면이 한 단계 진해진다(paper.300).
 * - tone `accent` — 잉크 면(accent.solid)에 지면색 글자, semibold. 줄에서 하나만 세우는 강조 칩이다
 *   (오픈소스 줄의 `58+ merged`). 누를 수 없는 표식이라 hover가 없다.
 *
 * 글자는 `label`(14/20 500)이다. 칩 안 글자가 코드 이름(프로젝트·패키지)이면 쓰는 쪽이 mono로
 * 덧씌운다 — 서체는 칩이 아니라 글자의 성격이 정한다. 덧씌울 때는 `css(chip.raw(…), {…})`로
 * 병합한다(`cx`는 충돌하는 원자 클래스를 병합하지 않는다).
 *
 * 면으로만 갈리는 상자라 버튼과 같은 강제 색상 모드용 투명 hairline(`forcedColorsEdge`)을 둔다.
 */
export const chip = cva({
  base: {
    ...forcedColorsEdge,
    display: 'inline-flex',
    alignItems: 'center',
    h: '8',
    px: '3',
    rounded: 'full',
    textStyle: 'label',
    whiteSpace: 'nowrap',
  },
  variants: {
    tone: {
      neutral: {
        bg: 'paper.200',
        color: 'ink.950',
        transition: 'colors',
        _hover: { bg: 'paper.300' },
      },
      accent: {
        bg: 'accent.solid',
        color: 'accent.onSolid',
        fontWeight: 'semibold',
      },
    },
  },
  defaultVariants: { tone: 'neutral' },
});
