'use client';

import { useMemo } from 'react';
import { useAdminDashboardData } from './useAdminViews';
import { getKSTDateISO, addDaysISO, formatMonthDayISO } from '@/lib/dates';
import type { AnalyticsRange } from '@/src/components/admin/AnalyticsRangeSelect';

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/**
 * 별도 분석 API가 붙기 전, 총 조회수 대비 고유 방문자 추정 비율.
 * GA·Plausible 같은 외부 데이터 소스를 도입하면 이 상수를 제거하고 실제값으로 대체합니다.
 */
export const UNIQUES_ESTIMATE_RATIO = 0.55;

export interface AnalyticsOverview {
  range: AnalyticsRange;
  rangeDays: number;
  total: number;
  totalDelta: number | null;
  uniques: number;
  uniquesDelta: number | null;
  postsPublished: number;
  avgPerPost: number;
  totalSeries: { date: string; value: number }[];
  topPosts: {
    slug: string;
    title: string;
    views: number;
    delta: number;
    series: number[];
  }[];
}

/**
 * Supabase admin dashboard 데이터를 가공해 Analytics 페이지에서 쓰는 형태로 반환.
 * 외부 분석 API를 붙이기 전 단계로, 클라이언트에서 trends/views를 그대로 가공한다.
 */
export function useAnalyticsOverview(range: AnalyticsRange): AnalyticsOverview {
  const { data } = useAdminDashboardData();

  return useMemo(() => {
    const rangeDays = RANGE_DAYS[range];
    // KST 기준 오늘부터 rangeDays·rangeDays*2일 윈도우. RPC가 반환하는
    // view_date도 KST이므로 동일 기준으로 비교해야 1일 시프트가 안 생깁니다.
    const todayISO = getKSTDateISO();

    const days: string[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      days.push(addDaysISO(todayISO, -i));
    }
    const prevDays: string[] = [];
    for (let i = rangeDays * 2 - 1; i >= rangeDays; i--) {
      prevDays.push(addDaysISO(todayISO, -i));
    }

    // 일별 합산 — 현재 기간 + 직전 기간을 한 번에 순회
    const dailyTotals = new Map<string, number>(days.map(d => [d, 0]));
    const prevTotals = new Map<string, number>(prevDays.map(d => [d, 0]));
    for (const post of data) {
      for (const t of post.trends) {
        if (dailyTotals.has(t.view_date)) {
          dailyTotals.set(t.view_date, (dailyTotals.get(t.view_date) ?? 0) + t.view_count);
        } else if (prevTotals.has(t.view_date)) {
          prevTotals.set(t.view_date, (prevTotals.get(t.view_date) ?? 0) + t.view_count);
        }
      }
    }

    const totalSeries = Array.from(dailyTotals.entries()).map(([d, v]) => ({
      date: formatMonthDayISO(d),
      value: v,
    }));

    const total = Array.from(dailyTotals.values()).reduce((s, v) => s + v, 0);
    const prevTotal = Array.from(prevTotals.values()).reduce((s, v) => s + v, 0);
    const totalDelta =
      prevTotal > 0 ? (total - prevTotal) / prevTotal : null;

    // 고유 방문자 — 분석 API 없으면 추정. UNIQUES_ESTIMATE_RATIO 단일 소스.
    const uniques = Math.round(total * UNIQUES_ESTIMATE_RATIO);
    const prevUniques = Math.round(prevTotal * UNIQUES_ESTIMATE_RATIO);
    const uniquesDelta =
      prevUniques > 0 ? (uniques - prevUniques) / prevUniques : null;

    const postsPublished = data.filter(p => p.status === 'published').length;
    const avgPerPost = postsPublished > 0 ? Math.round(total / postsPublished) : 0;

    // 글별 랭킹: 기간 내 합산 + 직전 기간 대비 증감
    const topPosts = [...data]
      .map(post => {
        let rangeViews = 0;
        let prevRangeViews = 0;
        const seriesMap = new Map<string, number>();
        days.forEach(d => seriesMap.set(d, 0));
        for (const t of post.trends) {
          if (dailyTotals.has(t.view_date)) {
            rangeViews += t.view_count;
            seriesMap.set(t.view_date, t.view_count);
          } else if (prevTotals.has(t.view_date)) {
            prevRangeViews += t.view_count;
          }
        }
        const delta =
          prevRangeViews > 0 ? (rangeViews - prevRangeViews) / prevRangeViews : 0;
        return {
          slug: post.slug,
          title: post.title,
          views: rangeViews,
          delta,
          series: Array.from(seriesMap.values()),
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return {
      range,
      rangeDays,
      total,
      totalDelta,
      uniques,
      uniquesDelta,
      postsPublished,
      avgPerPost,
      totalSeries,
      topPosts,
    };
  }, [data, range]);
}
