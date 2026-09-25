/**
 * "최근 N일"의 단일 정의 — 오늘을 포함한 N일, `[오늘-(N-1), 오늘]`. 개요와 글별 추이
 * 필터가 같은 창을 잡는다(파생 통계의 "7일 증감"은 오늘을 빼는 별도 지표다).
 * 저장소를 열지 않는 순수 모듈이라 admin 배럴 없이 직접 열어도 된다.
 */

import { addDaysISO } from '@blog/content';

/** 오늘을 포함한 최근 `days`일 창의 첫날(`YYYY-MM-DD`). */
export function trailingWindowStartISO(todayISO: string, days: number): string {
  return addDaysISO(todayISO, -(days - 1));
}

/** `endISO`로 끝나는 `days`일의 날짜들 — 과거 → `endISO` 순. */
export function trailingWindowDays(endISO: string, days: number): string[] {
  const start = trailingWindowStartISO(endISO, days);
  return Array.from({ length: days }, (_, i) => addDaysISO(start, i));
}
