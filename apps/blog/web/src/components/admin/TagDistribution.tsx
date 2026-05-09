'use client';

import { css } from '@design-system/ui-lib/css';

interface TagDistributionProps {
  tags: { id: string; count: number }[];
  /** 강조할 태그 — bundler 등 시리즈 색을 입힐 ID */
  highlightId?: string;
}

export const TagDistribution = ({ tags, highlightId }: TagDistributionProps) => {
  if (tags.length === 0) return null;
  const max = Math.max(...tags.map(t => t.count));
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2.5' })}>
      {tags.map(t => {
        const ratio = (t.count / max) * 100;
        const isHighlighted = t.id === highlightId;
        return (
          <div
            key={t.id}
            className={css({
              display: 'grid',
              gridTemplateColumns: '[110px 1fr 32px]',
              alignItems: 'center',
              gap: '3',
            })}
          >
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: 'xs',
                color: 'ink.700',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              })}
            >
              #{t.id}
            </span>
            <div
              className={css({
                position: 'relative',
                h: '[14px]',
                bg: 'paper.100',
                borderWidth: '[1px]',
                borderColor: 'ink.border',
              })}
            >
              <div
                className={css({
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  bottom: '0',
                  bg: isHighlighted ? 'marker.300' : 'ink.700',
                })}
                style={{ width: `${ratio}%` }}
              />
            </div>
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: 'xs',
                color: 'ink.500',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              {t.count}
            </span>
          </div>
        );
      })}
    </div>
  );
};
