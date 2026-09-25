import { cva } from '@design-system/ui-lib/css';

/**
 * 필터 패널 세그먼티드 컨트롤의 버튼 한 칸 — ViewToggle(tab) · SortRadio(radio) 공용.
 *
 * 두 컨트롤은 패딩과 활성/비활성 색(paper.300/ink.950 ↔ transparent/ink.600)을
 * 공유한다. 타이포그래피·transition·hover 정책은 `kind`가 가른다:
 * tab은 비활성일 때만 hover(ink.900)가 붙고, radio는 활성 상태에서도
 * hover(ink.950)를 선언한다.
 *
 * `kind`는 항상 명시한다 — 두 값이 상호 배타적 프리셋이라 canonical 기본값이
 * 없고, 빼먹으면 타이포·transition·hover가 통째로 빠진 버튼이 조용히 나온다.
 */
export const segmentedItem = cva({
  base: {
    px: '[12px]',
    py: '[5px]',
    cursor: 'pointer',
  },
  variants: {
    active: {
      true: { bg: 'paper.300', color: 'ink.950' },
      false: { bg: 'transparent', color: 'ink.600' },
    },
    kind: {
      tab: {
        flex: '1',
        fontFamily: 'mono',
        fontSize: 'xs',
        letterSpacing: 'wide',
        textTransform: 'uppercase',
        transition: '[all 0.15s]',
      },
      radio: {
        display: 'flex',
        alignItems: 'center',
        fontSize: 'sm',
        fontWeight: 'medium',
        whiteSpace: 'nowrap',
        textAlign: 'left',
        transition: '[color 0.15s, background 0.15s]',
      },
    },
  },
  compoundVariants: [
    {
      kind: 'tab',
      active: false,
      css: { _hover: { color: 'ink.900', bg: 'paper.200' } },
    },
    {
      kind: 'radio',
      active: true,
      css: { _hover: { color: 'ink.950', bg: 'paper.300' } },
    },
    {
      kind: 'radio',
      active: false,
      css: { _hover: { color: 'ink.950', bg: 'paper.200' } },
    },
  ],
  defaultVariants: { active: false },
});
