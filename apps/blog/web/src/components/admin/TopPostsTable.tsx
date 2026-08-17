'use client';

import { css } from '@design-system/ui-lib/css';
import Link from 'next/link';
// 클라이언트 컴포넌트의 @blog/content 배럴 import — node:fs 모듈(series 등)은
// next.config.ts의 optimizePackageImports + sideEffects:false가 번들에서 걸러 준다.
import { postPath } from '@blog/content';
import { fmtNum } from '@blog/content';
import { Sparkline } from '@/src/components/blog/Sparkline';
import { token } from '@design-system/ui-lib/tokens';
import type { TopPostSummary } from '@/domain/analytics';

interface TopPostsTableProps {
  rows: TopPostSummary[];
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
            href={postPath(p.slug)}
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
                    : 'spot.600',
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
