import type { KeyboardEvent } from 'react';
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

/**
 * 세그먼티드 라디오 그룹(정렬·뷰)의 화살표 키 — WAI-ARIA radio 패턴.
 *
 * 그룹 안에서는 선택된 칸 하나만 Tab 순서에 있고(roving tabindex), 화살표가
 * 선택과 초점을 함께 옮긴다(끝에서 돈다). 예전엔 role만 radio/tab이고 이 동작이
 * 없어서, 보조기술이 알려 준 조작법이 먹지 않았다.
 */
export function moveRadioByArrow<T>(
  e: KeyboardEvent<HTMLElement>,
  ids: readonly T[],
  onChange: (v: T) => void,
): void {
  const step =
    e.key === 'ArrowRight' || e.key === 'ArrowDown'
      ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        ? -1
        : 0;
  if (step === 0) return;
  const radios = Array.from(
    e.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [],
  );
  const index = radios.indexOf(e.currentTarget);
  if (index === -1 || radios.length !== ids.length) return;
  e.preventDefault();
  const nextIndex = (index + step + ids.length) % ids.length;
  const next = ids[nextIndex];
  if (next === undefined) return;
  onChange(next);
  radios[nextIndex]?.focus();
}
