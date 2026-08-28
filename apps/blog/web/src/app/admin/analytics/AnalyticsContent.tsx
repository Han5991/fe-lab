'use client';

import { useState } from 'react';
import { css } from '@design-system/ui-lib/css';

import { Label } from '@/src/components/blog/Label';
import { fmtNum } from '@blog/content';
import {
  useAnalyticsOverview,
  UNIQUES_ESTIMATE_RATIO,
} from '@/src/hooks/useAnalyticsOverview';
import { AnalyticsRangeSelect } from '@/src/components/admin/AnalyticsRangeSelect';
import type { AnalyticsRange } from '@/src/domain/analytics';
import { KpiCard } from '@/src/components/admin/KpiCard';
import { TimeSeriesChart } from '@/src/components/admin/TimeSeriesChart';
import { TopPostsTable } from '@/src/components/admin/TopPostsTable';
import { TagDistribution } from '@/src/components/admin/TagDistribution';

interface AnalyticsContentProps {
  tags: { id: string; count: number }[];
}

export const AnalyticsContent = ({ tags }: AnalyticsContentProps) => {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const overview = useAnalyticsOverview(range);

  const totalTitle = `TOTAL VIEWS · ${overview.range.toUpperCase()}`;
  const topTitle = `TOP POSTS · ${overview.range.toUpperCase()}`;

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '10' })}>
      {/* 헤더 라인 */}
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4',
          flexWrap: 'wrap',
        })}
      >
        <Label tone="meta">
          ANALYTICS · 최근{' '}
          {overview.range === '7d'
            ? '7일'
            : overview.range === '90d'
              ? '90일'
              : '30일'}
        </Label>
        <AnalyticsRangeSelect value={range} onChange={setRange} />
      </div>

      {/* KPI row */}
      <section
        className={css({
          display: 'grid',
          gridTemplateColumns: {
            base: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: { base: '6', md: '8' },
          pb: '8',
          borderBottomWidth: '[1px]',
          borderColor: 'ink.border',
        })}
      >
        <KpiCard
          num={fmtNum(overview.total)}
          label="TOTAL VIEWS"
          delta={overview.totalDelta ?? undefined}
          series={overview.totalSeries.map(d => d.value)}
        />
        <KpiCard
          num={fmtNum(overview.uniques)}
          label="UNIQUE VISITS"
          delta={overview.uniquesDelta ?? undefined}
          small={`${Math.round(UNIQUES_ESTIMATE_RATIO * 100)}% 추정`}
        />
        <KpiCard
          num={String(overview.postsPublished)}
          label="POSTS PUBLISHED"
        />
        <KpiCard num={fmtNum(overview.avgPerPost)} label="AVG / POST" />
      </section>

      {/* 시계열 차트 */}
      <section>
        <div
          className={css({
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            mb: '4',
            pb: '3',
            borderBottomWidth: '[1px]',
            borderColor: 'ink.border',
          })}
        >
          <Label tone="meta">{totalTitle}</Label>
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'xs',
              color: 'ink.500',
            })}
          >
            일별 합산 view 수
          </span>
        </div>
        <TimeSeriesChart data={overview.totalSeries} />
      </section>

      {/* Top posts + Tag distribution */}
      <section
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', lg: '6fr 5fr' },
          gap: { base: '8', lg: '12' },
        })}
      >
        <div>
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              mb: '4',
              pb: '3',
              borderBottomWidth: '[1px]',
              borderColor: 'ink.border',
            })}
          >
            <Label tone="meta">{topTitle}</Label>
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: 'xs',
                color: 'ink.500',
              })}
            >
              {overview.topPosts.length}편
            </span>
          </div>
          {overview.topPosts.length === 0 ? (
            <p
              className={css({
                fontFamily: 'serif',
                fontStyle: 'italic',
                fontSize: 'md',
                color: 'ink.500',
                py: '8',
                textAlign: 'center',
              })}
            >
              해당 기간에 데이터가 없습니다.
            </p>
          ) : (
            <TopPostsTable rows={overview.topPosts} />
          )}
        </div>

        <div>
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              mb: '4',
              pb: '3',
              borderBottomWidth: '[1px]',
              borderColor: 'ink.border',
            })}
          >
            <Label tone="meta">TAG DISTRIBUTION</Label>
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: 'xs',
                color: 'ink.500',
              })}
            >
              top {Math.min(8, tags.length)}
            </span>
          </div>
          <TagDistribution tags={tags.slice(0, 8)} highlightId={tags[0]?.id} />
        </div>
      </section>
    </div>
  );
};
