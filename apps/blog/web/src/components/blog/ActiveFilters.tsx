'use client';

import { css } from '@design-system/ui-lib/css';
import { Label } from './Label';
import { Tag } from './Tag';

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
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '2',
        flexWrap: 'wrap',
        py: '3',
        mb: '4',
        borderTopWidth: '1px',
        borderBottomWidth: '1px',
        borderColor: 'ink.border',
      })}
    >
      <Label tone="meta">필터</Label>
      {series && (
        <Tag active onClick={onClearSeries}>
          ▸ {series} ✕
        </Tag>
      )}
      {year && (
        <Tag active onClick={onClearYear}>
          {year} ✕
        </Tag>
      )}
      {tags.map(t => (
        <Tag key={t} active onClick={() => onRemoveTag(t)}>
          #{t} ✕
        </Tag>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className={css({
          fontFamily: 'mono',
          fontSize: 'xs',
          color: 'marker.600',
          textDecorationLine: 'underline',
          textDecorationColor: 'transparent',
          cursor: 'pointer',
          ml: '2',
          _hover: { textDecorationColor: 'marker.600' },
          transition: 'text-decoration-color 0.15s',
        })}
      >
        ✕ 모두 지우기
      </button>
    </div>
  );
};
