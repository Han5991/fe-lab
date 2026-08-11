import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { SeriesSummary } from '@/domain/post/aggregate';

/** 홈에 세울 시리즈 칸 수. 나머지는 `/series/`가 받는다. */
export const HOME_SERIES_COUNT = 6;

interface SeriesBandProps {
  series: SeriesSummary[];
  /** 목록을 이름 짓는 밴드 라벨의 id. */
  labelledBy: string;
  limit?: number;
}

/**
 * "시리즈로 읽기" 면 — 시리즈를 편수·최근 발행일과 함께 격자로 세운다.
 *
 * 홈에 이 면이 필요한 이유는 축이 다르기 때문이다. 위의 최근 글 목록은
 * **시간** 축이라 연재물이 시간 순서에 흩어져, 4~8편짜리 시리즈가 홈에서는
 * 낱글로만 보인다. 이 면은 같은 글을 **묶음** 축으로 다시 세운다.
 *
 * 칸을 카드로 만들지 않는다. 배경도 그림자도 없이 격자선(hairline)만으로
 * 나눈다 — 칸마다 상자를 세우면 홈에 떠 있는 표면이 한 층 더 생긴다.
 * 컨테이너가 좌·상 보더를, 칸이 우·하 보더를 그려서 선이 겹치지 않는다.
 *
 * 편수는 무채색이다. 액센트는 제목 계열에만 붙는다.
 */
export const SeriesBand = ({
  series,
  labelledBy,
  limit = HOME_SERIES_COUNT,
}: SeriesBandProps) => {
  const shown = series.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <ul
      aria-labelledby={labelledBy}
      className={css({
        display: 'grid',
        // 좁은 화면에서 한 칸이 컨테이너보다 넓어지지 않도록 min()으로 묶는다.
        gridTemplateColumns:
          '[repeat(auto-fill, minmax(min(100%, 200px), 1fr))]',
        listStyleType: 'none',
        p: '0',
        m: '0',
        borderLeftWidth: 'hairline',
        borderTopWidth: 'hairline',
        borderStyle: 'solid',
        borderColor: 'ink.border',
      })}
    >
      {shown.map(entry => (
        <li key={entry.id}>
          <Link
            href={`/posts/?series=${encodeURIComponent(entry.id)}`}
            className={css({
              display: 'grid',
              gap: '[5px]',
              alignContent: 'start',
              h: 'full',
              px: '[14px]',
              py: '[12px]',
              minW: '0',
              borderRightWidth: 'hairline',
              borderBottomWidth: 'hairline',
              borderStyle: 'solid',
              borderColor: 'ink.border',
              transition: '[background-color 0.15s]',
              _hover: {
                bg: 'paper.100',
                '& [data-series-name]': { color: 'accent.600' },
              },
            })}
          >
            <span
              className={css({
                fontFamily: 'mono',
                fontWeight: 'normal',
                fontSize: '[11px]',
                color: 'ink.500',
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              {entry.count}편
            </span>
            <span
              data-series-name
              className={css({
                fontSize: '[14px]',
                lineHeight: 'snug',
                color: 'ink.950',
                overflowWrap: 'anywhere',
                transition: '[color 0.15s]',
              })}
            >
              {entry.title}
            </span>
            {entry.updated && (
              <span
                className={css({
                  fontFamily: 'mono',
                  fontWeight: 'normal',
                  fontSize: '[11px]',
                  color: 'ink.500',
                  fontVariantNumeric: 'tabular-nums',
                })}
              >
                최근 {entry.updated}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
};
