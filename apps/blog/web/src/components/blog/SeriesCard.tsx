import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { SeriesSummary } from '@/domain/post/aggregate';
import { fmtDate } from '@/lib/format';

interface SeriesCardProps {
  series: SeriesSummary;
  index: number;
}

const accentColor: Record<SeriesSummary['colorKey'], string> = {
  accent: 'accent.600',
  marker: 'marker.600',
  moss: 'moss.600',
};

export const SeriesCard = ({ series, index }: SeriesCardProps) => {
  return (
    <Link
      href={`/posts/?series=${encodeURIComponent(series.id)}`}
      className={css({
        position: 'relative',
        display: 'flex',
        flexDir: 'column',
        gap: '3',
        p: '6',
        bg: 'paper.50',
        borderWidth: '1px',
        borderColor: 'ink.border',
        transition: 'border-color 0.15s',
        minH: '200px',
        _hover: { borderColor: 'ink.borderStrong' },
      })}
    >
      {/* 좌측 4px 시리즈 컬러 키 */}
      <span
        aria-hidden="true"
        className={css({
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          w: '4px',
          bg: accentColor[series.colorKey],
        })}
      />
      <div
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          gap: '2',
        })}
      >
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: 'xs',
            color: accentColor[series.colorKey],
            letterSpacing: '0.12em',
            fontWeight: '500',
          })}
        >
          {String(index + 1).padStart(2, '0')} / SERIES
        </span>
      </div>

      <h3
        className={css({
          fontFamily: 'serif',
          fontSize: '2xl',
          fontWeight: '600',
          lineHeight: '1.2',
          color: 'ink.950',
        })}
      >
        {series.title}
      </h3>

      {series.description && (
        <p
          className={css({
            fontFamily: 'sans',
            fontSize: 'sm',
            color: 'ink.700',
            lineHeight: '1.6',
            lineClamp: 3,
          })}
        >
          {series.description}
        </p>
      )}

      <div className={css({ flex: 1 })} />

      <div
        className={css({
          pt: '3',
          borderTopWidth: '1px',
          borderColor: 'ink.border',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        })}
      >
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: 'xs',
            color: 'ink.700',
            letterSpacing: '0.04em',
          })}
        >
          {series.count}편
          {series.updated ? ` · ${fmtDate(series.updated)} 업데이트` : ''}
        </span>
      </div>
    </Link>
  );
};
