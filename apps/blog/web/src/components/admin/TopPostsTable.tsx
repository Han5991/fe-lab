import Link from 'next/link';
import type { ReactNode } from 'react';
import { css, cva } from '@blog/styled-system/css';
import { token } from '@blog/styled-system/tokens';
import { fmtNum } from '@blog/content/client';
import { Sparkline } from '@/src/components/blog/Sparkline';
import type { TopPostSummary } from '@/src/domain/analytics';
import { adminAnalyticsPostPath } from '@/src/shared/routes';
import {
  adminCell,
  adminTable,
  adminTableBody,
  cardTableBleed,
  rowLink,
  truncate,
} from './adminStyles';

interface TopPostsTableProps {
  rows: TopPostSummary[];
  /**
   * 줄 끝 칸 — 대시보드의 '새 탭에서 열기'. 글이 공개 중인지는 이 표의 줄(기간 요약)에 없어 부르는
   * 쪽이 글 데이터로 정한다.
   */
  renderAction?: (row: TopPostSummary) => ReactNode;
}

// 데이터 색 — admin 차트와 같은 spot.600.
const SERIES_COLOR = token('colors.spot.600');

const deltaTone = cva({
  variants: {
    direction: {
      up: { color: 'moss.700' },
      down: { color: 'spot.600' },
      none: { color: 'ink.700' },
    },
  },
});

/** 줄 끝 동작 칸 — sm 미만은 접는다(아래 머리 주석). */
const actionHeadCell = css(adminCell.raw({ kind: 'head' }), {
  w: '12',
  display: { base: 'none', sm: 'table-cell' },
});
const actionBodyCell = css(adminCell.raw({ align: 'end' }), {
  display: { base: 'none', sm: 'table-cell' },
});

/** 증감의 방향 — null은 직전 기간이 0이라 비교할 수 없다는 뜻이다(`domain/analytics/delta.ts`). */
const directionOf = (delta: number | null) =>
  delta === null ? 'none' : delta >= 0 ? 'up' : 'down';

/**
 * 기간 상위 글 — 순위 · 제목 · 기간 추이 · 기간 조회수 · 직전 기간 대비 증감. 제목은 그 글의 admin
 * 통계(분석 화면에서 그 글이 고른 상태)로 열고, 실제 글은 줄 끝 칸(`renderAction`)이 연다. 추이 열은
 * md 미만에서 숨긴다.
 */
export const TopPostsTable = ({ rows, renderAction }: TopPostsTableProps) => {
  return (
    <div className={cardTableBleed}>
      <table className={adminTable}>
        <thead>
          <tr>
            <th
              scope="col"
              className={css(adminCell.raw({ kind: 'head' }), { w: '14' })}
            >
              순위
            </th>
            <th scope="col" className={adminCell({ kind: 'head' })}>
              제목
            </th>
            <th
              scope="col"
              className={css(adminCell.raw({ kind: 'head' }), {
                w: '28',
                display: { base: 'none', md: 'table-cell' },
              })}
            >
              추이
            </th>
            <th
              scope="col"
              className={css(adminCell.raw({ kind: 'head', align: 'end' }), {
                w: '20',
              })}
            >
              조회수
            </th>
            <th
              scope="col"
              className={css(adminCell.raw({ kind: 'head', align: 'end' }), {
                w: '20',
              })}
            >
              증감
            </th>
            {/* sm 미만은 접는다 — 칸이 다섯이라 제목이 두세 글자로 줄어든다. 그 폭에서는 제목이 여는
                분석 화면의 '글 열기'가 실제 글로 간다. */}
            {renderAction !== undefined && (
              <th scope="col" className={actionHeadCell}>
                <span className={css({ srOnly: true })}>글 열기</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className={adminTableBody}>
          {rows.map((p, i) => (
            <tr key={p.slug}>
              <td
                className={css(adminCell.raw(), {
                  fontFamily: 'mono',
                  fontSize: '[13px]',
                  color: 'ink.700',
                })}
              >
                {String(i + 1).padStart(2, '0')}
              </td>
              <td className={adminCell()}>
                <Link
                  href={adminAnalyticsPostPath(p.slug)}
                  className={css(truncate, rowLink)}
                >
                  {p.title}
                </Link>
              </td>
              <td
                className={css(adminCell.raw(), {
                  display: { base: 'none', md: 'table-cell' },
                })}
              >
                <Sparkline
                  data={p.series}
                  w={96}
                  h={24}
                  color={SERIES_COLOR}
                  fill={SERIES_COLOR}
                />
              </td>
              <td
                className={css(adminCell.raw({ align: 'end' }), {
                  fontWeight: 'medium',
                })}
              >
                {fmtNum(p.views)}
              </td>
              <td className={adminCell({ align: 'end' })}>
                {/* 칸의 글자색(본문 잉크)과 겨루지 않게 방향 색은 안쪽 글자에 준다. */}
                <span
                  className={deltaTone({ direction: directionOf(p.delta) })}
                >
                  {p.delta === null
                    ? '—'
                    : `${p.delta >= 0 ? '↑' : '↓'} ${Math.abs(p.delta * 100).toFixed(0)}%`}
                </span>
              </td>
              {renderAction !== undefined && (
                <td className={actionBodyCell}>{renderAction(p)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
