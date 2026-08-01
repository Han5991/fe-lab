import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { SeriesSummary } from '@/domain/post/aggregate';
import { fmtDate } from '@/lib/format';

interface SeriesCardProps {
  series: SeriesSummary;
  index: number;
}

/**
 * 시리즈 카드.
 *
 * 리뉴얼 전에는 좌측에 3px 컬러 바(`series.colorKey`)를 세워 시리즈마다 다른
 * 색을 썼지만, 새 팔레트는 "무채색 + 포인트 1색"이라 색으로 위계를 나누지
 * 않는다. 구분은 hairline 보더 하나로만 하고 포인트색은 시리즈 배지에만 남긴다.
 * (`colorKey`는 도메인 타입에 그대로 있으니 다른 화면에서 필요하면 다시 쓸 수 있다)
 */
export const SeriesCard = ({ series, index }: SeriesCardProps) => {
  return (
    <Link
      href={`/posts/?series=${encodeURIComponent(series.id)}`}
      className={css({
        display: 'flex',
        flexDir: 'column',
        gap: '[8px]',
        px: '[20px]',
        py: '[18px]',
        minH: '[180px]',
        borderWidth: '[1px]',
        borderStyle: 'solid',
        borderColor: 'ink.border',
        rounded: 'card',
        transition: '[border-color 0.15s]',
        _hover: {
          borderColor: 'ink.borderStrong',
          '& h3': { textDecorationLine: 'underline' },
        },
      })}
    >
      {/* 레퍼런스 .badge — 시리즈임을 알리는 유일한 포인트색 요소 */}
      <span
        className={css({
          alignSelf: 'flex-start',
          fontSize: '[12px]',
          lineHeight: 'snug',
          color: 'accent.600',
          bg: 'accent.50',
          rounded: '[6px]',
          px: '[9px]',
          py: '[2px]',
        })}
      >
        시리즈 · {String(index + 1).padStart(2, '0')}
      </span>

      <h3
        className={css({
          fontSize: '[16px]',
          fontWeight: 'semibold',
          lineHeight: 'headerSm',
          color: 'ink.950',
        })}
      >
        {series.title}
      </h3>

      {series.description && (
        <p
          className={css({
            fontSize: '[13px]',
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
          alignItems: 'baseline',
          gap: '[8px]',
          fontFamily: 'mono',
          fontWeight: 'normal',
          fontSize: '[12px]',
          color: 'ink.500',
          fontVariantNumeric: 'tabular-nums',
        })}
      >
        <span>{series.count}편</span>
        {series.updated && <span>{fmtDate(series.updated)} 업데이트</span>}
      </div>
    </Link>
  );
};
