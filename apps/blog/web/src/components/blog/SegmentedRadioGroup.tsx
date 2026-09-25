'use client';

import { useId, useRef, type KeyboardEvent } from 'react';
import { css, cx } from '@design-system/ui-lib/css';
import { Label } from './Label';
import { segmentedItem } from './segmented';

interface SegmentedRadioGroupProps<T extends string> {
  /** 보이는 라벨이자 radiogroup의 이름. */
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  kind: 'tab' | 'radio';
  className: string;
  /** 둘째 칸부터 붙는 구분선. */
  dividerClassName?: string;
}

/**
 * 세그먼티드 라디오 그룹 — WAI-ARIA radio 패턴(roving tabindex, 화살표가 선택과 초점을
 * 함께 옮긴다). 데스크톱·모바일 시트 두 곳에 렌더되므로 라벨 id는 useId다.
 */
export function SegmentedRadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  kind,
  className,
  dividerClassName,
}: SegmentedRadioGroupProps<T>) {
  const labelId = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  const moveByArrow = (e: KeyboardEvent, index: number) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    e.preventDefault();
    const nextIndex = (index + step + options.length) % options.length;
    const next = options[nextIndex];
    if (next === undefined) return;
    onChange(next.id);
    const radios =
      groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]');
    radios?.[nextIndex]?.focus();
  };

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <Label tone="meta" id={labelId}>
        {label}
      </Label>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        className={className}
      >
        {options.map((opt, i) => {
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              type="button"
              onClick={() => onChange(opt.id)}
              onKeyDown={e => moveByArrow(e, i)}
              className={cx(
                segmentedItem({ kind, active: isActive }),
                i > 0 && dividerClassName,
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
