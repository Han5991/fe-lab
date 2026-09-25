'use client';

import { css } from '@design-system/ui-lib/css';
import { tagPillStyle } from './tagPillStyle';

interface ActiveFiltersProps {
  tags: string[];
  /**
   * 활성 시리즈의 **제목**(화면에 보일 이름). URL에는 시리즈 id(폴더 경로)가
   * 실리는데, 예전엔 그 id가 칩에 그대로 찍혔다(`[Typescript로 설계하는 …]`).
   */
  seriesLabel: string | null;
  year: string | null;
  onRemoveTag: (tag: string) => void;
  onClearSeries: () => void;
  onClearYear: () => void;
  onClearAll: () => void;
}

const chipClass = css(tagPillStyle, {
  gap: '[6px]',
  color: 'ink.800',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: '[all 0.15s]',
  _hover: { bg: 'paper.300', color: 'ink.950' },
});

const removeIconClass = css({
  fontSize: '[10px]',
  color: 'ink.500',
  lineHeight: 'flat',
});

/** 칩은 누르면 그 필터를 푸는 버튼이다 — 이름에 "해제"를 담는다. */
const removeLabel = (label: string) => `${label} 필터 해제`;

export const ActiveFilters = ({
  tags,
  seriesLabel,
  year,
  onRemoveTag,
  onClearSeries,
  onClearYear,
  onClearAll,
}: ActiveFiltersProps) => {
  const total = tags.length + (seriesLabel ? 1 : 0) + (year ? 1 : 0);
  if (total === 0) return null;

  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '2',
        flexWrap: 'wrap',
        py: '3',
        mb: '4',
        borderTopWidth: '[1px]',
        borderBottomWidth: '[1px]',
        borderColor: 'ink.border',
      })}
    >
      <span
        className={css({
          fontSize: '[12px]',
          fontWeight: 'medium',
          color: 'ink.500',
        })}
      >
        필터
      </span>
      {seriesLabel && (
        <button
          type="button"
          onClick={onClearSeries}
          aria-label={removeLabel(seriesLabel)}
          className={chipClass}
        >
          {seriesLabel}
          <span aria-hidden="true" className={removeIconClass}>
            ✕
          </span>
        </button>
      )}
      {year && (
        <button
          type="button"
          onClick={onClearYear}
          aria-label={removeLabel(year)}
          className={chipClass}
        >
          {year}
          <span aria-hidden="true" className={removeIconClass}>
            ✕
          </span>
        </button>
      )}
      {tags.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onRemoveTag(t)}
          aria-label={removeLabel(`#${t}`)}
          className={chipClass}
        >
          #{t}
          <span aria-hidden="true" className={removeIconClass}>
            ✕
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className={css({
          ml: '2',
          fontSize: 'sm',
          fontWeight: 'medium',
          color: 'accent.600',
          cursor: 'pointer',
          textDecorationLine: 'underline',
          textDecorationColor: 'transparent',
          textUnderlineOffset: '[2px]',
          transition: '[text-decoration-color 0.15s]',
          _hover: { textDecorationColor: 'accent.600' },
        })}
      >
        모두 지우기
      </button>
    </div>
  );
};
