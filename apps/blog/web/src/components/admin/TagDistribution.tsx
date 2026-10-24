import { css } from '@blog/styled-system/css';
import { barFill, barTrack, truncate } from './adminStyles';

interface TagDistributionProps {
  tags: { id: string; count: number }[];
  /** 데이터 색으로 세울 태그 — 1위. 나머지는 무채색 막대다. */
  highlightId?: string | undefined;
}

/**
 * 태그별 글 수 — 승인 목업의 가로 막대(태그 mono 13 · 높이 8 pill 막대 · 개수). 막대 폭은 1위
 * 대비 비율이고, 개수를 글자로 함께 적어 막대 색에 기대지 않는다.
 */
export const TagDistribution = ({
  tags,
  highlightId,
}: TagDistributionProps) => {
  if (tags.length === 0) return null;
  const max = Math.max(...tags.map(t => t.count));
  return (
    <ul className={css({ display: 'flex', flexDir: 'column', gap: '2.5' })}>
      {tags.map(t => (
        <li
          key={t.id}
          className={css({
            display: 'grid',
            gridTemplateColumns: '[120px minmax(0, 1fr) 32px]',
            alignItems: 'center',
            gap: '3',
          })}
        >
          <span
            className={css(truncate, {
              fontFamily: 'mono',
              fontSize: '[13px]',
              color: 'ink.950',
            })}
          >
            #{t.id}
          </span>
          <span className={barTrack} aria-hidden>
            <span
              className={barFill({
                tone: t.id === highlightId ? 'data' : 'muted',
              })}
              style={{ width: `${(t.count / max) * 100}%` }}
            />
          </span>
          <span
            className={css({
              textStyle: 'body',
              color: 'ink.700',
              textAlign: 'end',
              fontVariantNumeric: 'tabular-nums',
            })}
          >
            {t.count}
          </span>
        </li>
      ))}
    </ul>
  );
};
