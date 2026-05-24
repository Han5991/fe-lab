'use client';

import { css } from '@design-system/ui-lib/css';
import Link from 'next/link';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtNum } from '@/lib/format';
import { Sparkline } from '@/src/components/blog/Sparkline';
import { token } from '@design-system/ui-lib/tokens';

export interface TopPostRow {
  slug: string;
  title: string;
  views: number;
  /** 직전 기간 대비 증감율. 직전 기간 데이터가 없으면 null (totalDelta와 일관). */
  delta: number | null;
  series: number[];
}

interface TopPostsTableProps {
  rows: TopPostRow[];
}

export const TopPostsTable = ({ rows }: TopPostsTableProps) => {
  return (
    <ol className={css({ listStyleType: 'none', p: '0', m: '0' })}>
      {rows.map((p, i) => (
        <li
          key={p.slug}
          className={css({
            display: 'grid',
            gridTemplateColumns: '[32px 1fr 96px 72px 56px]',
            alignItems: 'center',
            gap: '3',
            py: '3',
            borderBottomWidth: '[1px]',
            borderColor: 'ink.border',
            transition: '[background 0.15s]',
            _hover: { bg: 'paper.100' },
          })}
        >
          <span
            className={css({
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: 'lg',
              fontWeight: 'medium',
              color: 'ink.300',
              textAlign: 'center',
            })}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <Link
            href={`/posts/${encodePostSlug(p.slug)}/`}
            className={css({
              fontFamily: 'sans',
              fontSize: 'sm',
              fontWeight: 'medium',
              color: 'ink.950',
              minW: '0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: '[color 0.15s]',
              _hover: { color: 'accent.600', textDecorationLine: 'underline' },
            })}
          >
            {p.title}
          </Link>
          <Sparkline
            data={p.series}
            w={96}
            h={24}
            color={token('colors.ink.700')}
            fill={token('colors.ink.700')}
          />
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'sm',
              fontWeight: 'medium',
              color: 'ink.950',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            })}
          >
            {fmtNum(p.views)}
          </span>
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'xs',
              color:
                p.delta === null
                  ? 'ink.400'
                  : p.delta >= 0
                    ? 'moss.600'
                    : 'marker.600',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            })}
          >
            {p.delta === null
              ? '—'
              : `${p.delta >= 0 ? '↑' : '↓'} ${Math.abs(p.delta * 100).toFixed(0)}%`}
          </span>
        </li>
      ))}
    </ol>
  );
};
