import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { tagPillStyle } from './tagPillStyle';
import type { SeriesSummary } from '@/domain/post/aggregate';
import { fmtDate } from '@/lib/format';

interface SeriesCardProps {
  series: SeriesSummary;
  index: number;
}

const accentColor = {
  accent: 'accent.600',
  marker: 'marker.600',
  moss: 'moss.600',
} as const;

export const SeriesCard = ({ series, index }: SeriesCardProps) => {
  return (
    <Link
      href={`/posts/?series=${encodeURIComponent(series.id)}`}
      className={css({
        position: 'relative',
        display: 'flex',
        flexDir: 'column',
        gap: '[8px]',
        p: '[16px]',
        bg: 'paper.100',
        borderWidth: '[1px]',
        borderStyle: 'solid',
        borderColor: 'ink.border',
        rounded: '[6px]',
        transition: '[border-color 0.15s]',
        minH: '[200px]',
        _hover: { borderColor: 'ink.borderStrong' },
      })}
    >
      <span
        aria-hidden="true"
        className={css({
          position: 'absolute',
          left: '0',
          top: '0',
          bottom: '0',
          w: '[3px]',
          roundedLeft: '[6px]',
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
            fontSize: '[12px]',
            color: 'ink.500',
            fontWeight: 'medium',
          })}
        >
          {String(index + 1).padStart(2, '0')} / SERIES
        </span>
      </div>

      <h3
        className={css({
          fontFamily: 'sans',
          fontSize: 'lg',
          fontWeight: 'semibold',
          lineHeight: 'tight',
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
            color: 'ink.600',
            lineHeight: 'relaxed',
            lineClamp: 3,
          })}
        >
          {series.description}
        </p>
      )}

      <div className={css({ flex: '1' })} />

      <div
        className={css({
          pt: '[12px]',
          borderTopWidth: '[1px]',
          borderTopStyle: 'solid',
          borderColor: 'ink.border',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '2',
        })}
      >
        <span
          className={css(tagPillStyle, {
            px: '[8px]',
            bg: 'paper.300',
            fontFamily: 'mono',
          })}
        >
          {series.count}편
        </span>
        {series.updated && (
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: '[12px]',
              color: 'ink.500',
            })}
          >
            {fmtDate(series.updated)} 업데이트
          </span>
        )}
      </div>
    </Link>
  );
};
