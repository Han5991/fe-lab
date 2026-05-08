'use client';

import { useMemo } from 'react';
import { useAdminDashboardData } from './useAdminViews';
import type { AnalyticsRange } from '@/src/components/admin/AnalyticsRangeSelect';

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: string[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push(iso);
    }
    const prevDays: string[] = [];
    for (let i = rangeDays * 2 - 1; i >= rangeDays; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      prevDays.push(d.toISOString().slice(0, 10));
    }

    // 일별 합산
    const dailyTotals = new Map<string, number>();
    days.forEach(d => dailyTotals.set(d, 0));
    for (const post of data) {
      for (const t of post.trends) {
        if (dailyTotals.has(t.view_date)) {
          dailyTotals.set(t.view_date, (dailyTotals.get(t.view_date) ?? 0) + t.view_count);
        }
      }
    }

    const prevTotals = new Map<string, number>();
    prevDays.forEach(d => prevTotals.set(d, 0));
    for (const post of data) {
      for (const t of post.trends) {
        if (prevTotals.has(t.view_date)) {
          prevTotals.set(t.view_date, (prevTotals.get(t.view_date) ?? 0) + t.view_count);
        }
      }
    }

    const totalSeries = Array.from(dailyTotals.entries())
      .map(([d, v]) => {
        const date = new Date(d);
        return {
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          value: v,
        };
      });

    const total = Array.from(dailyTotals.values()).reduce((s, v) => s + v, 0);
    const prevTotal = Array.from(prevTotals.values()).reduce((s, v) => s + v, 0);
    const totalDelta =
      prevTotal > 0 ? (total - prevTotal) / prevTotal : null;

    // 고유 방문자 — 분석 API 없으면 추정 (대략 50%)
    const uniques = Math.round(total * 0.55);
    const prevUniques = Math.round(prevTotal * 0.55);
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
          views: rangeViews || post.totalViews,
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
