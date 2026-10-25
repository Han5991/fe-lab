/**
 * "최근 N일"의 단일 정의 — 오늘을 포함한 N일, `[오늘-(N-1), 오늘]`. 개요와 글별 추이
 * 필터가 같은 창을 잡는다(파생 통계의 "7일 증감"은 오늘을 빼는 별도 지표다).
 * 저장소를 열지 않는 순수 모듈이라 admin 배럴 없이 직접 열어도 된다.
 */

import { addDaysISO, diffDaysISO } from '@blog/content/client';
import type { TrendPoint } from './types';

/** 오늘을 포함한 최근 `days`일 창의 첫날(`YYYY-MM-DD`). */
export function trailingWindowStartISO(todayISO: string, days: number): string {
  return addDaysISO(todayISO, -(days - 1));
}

/** `endISO`로 끝나는 `days`일의 날짜들 — 과거 → `endISO` 순. */
export function trailingWindowDays(endISO: string, days: number): string[] {
  const start = trailingWindowStartISO(endISO, days);
  return Array.from({ length: days }, (_, i) => addDaysISO(start, i));
}

/**
 * `[startISO, endISO]`의 날마다 한 줄 — 행이 없는 날은 0이다. 일별 추이 RPC는 조회가 있던 날만
 * 주므로, 그 행만 이으면 차트의 x축(범주형)이 날짜 간격을 잃고 선이 0에 닿지 않는다(조회 1회인 날이
 * 띄엄띄엄 있으면 1에서 평평한 선이 된다). 같은 날 행이 둘이면 나중 값이다. 시작이 끝보다 늦으면 빈
 * 배열이다.
 */
export function fillDailyGaps(
  rows: readonly TrendPoint[],
  startISO: string,
  endISO: string,
): TrendPoint[] {
  const counts = new Map(rows.map(row => [row.view_date, row.view_count]));
  const days = diffDaysISO(startISO, endISO) + 1;
  return Array.from({ length: Math.max(days, 0) }, (_, i) => {
    const view_date = addDaysISO(startISO, i);
    return { view_date, view_count: counts.get(view_date) ?? 0 };
  });
}
