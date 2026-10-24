/**
 * Analytics 개요가 고를 수 있는 기간 — 순서가 화면의 탭 순서다.
 *
 * 계산(`overview.ts`)과 대시보드의 집계 기간 세그먼트(`src/app/admin/page.tsx`)가 함께 읽는 값이라 의존 없는 leaf에
 * 둔다. 공개 배럴이 값으로 내보내도 계산 모듈 그래프가 따라오지 않는다.
 */
export const ANALYTICS_RANGES = ['7d', '30d', '90d'] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

/** 기간마다 거슬러 올라가는 일수(오늘 포함). */
export const RANGE_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
} as const satisfies Record<AnalyticsRange, number>;
