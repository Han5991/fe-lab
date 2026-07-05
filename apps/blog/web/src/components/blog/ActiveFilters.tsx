'use client';

import { css } from '@design-system/ui-lib/css';
import { tagPillStyle } from './tagPillStyle';

export interface ActiveFiltersProps {
  tags: string[];
  series: string | null;
  year: string | null;
  onRemoveTag: (tag: string) => void;
  onClearSeries: () => void;
  onClearYear: () => void;
  onClearAll: () => void;
}

export const ActiveFilters = ({
  tags,
  series,
  year,
  onRemoveTag,
  onClearSeries,
  onClearYear,
  onClearAll,
}: ActiveFiltersProps) => {
  const total = tags.length + (series ? 1 : 0) + (year ? 1 : 0);
  if (total === 0) return null;

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
      {series && (
        <button type="button" onClick={onClearSeries} className={chipClass}>
          {series}
          <span className={removeIconClass}>✕</span>
        </button>
      )}
      {year && (
        <button type="button" onClick={onClearYear} className={chipClass}>
          {year}
          <span className={removeIconClass}>✕</span>
        </button>
      )}
      {tags.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onRemoveTag(t)}
          className={chipClass}
        >
          #{t}
          <span className={removeIconClass}>✕</span>
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
