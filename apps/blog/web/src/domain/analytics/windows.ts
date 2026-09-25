/**
 * "최근 N일"의 단일 정의 — 오늘을 **포함한** N일, `[오늘-(N-1), 오늘]`.
 *
 * 예전에는 같은 "7일"이 세 가지였다. 개요(overview)는 오늘 포함 7일, 글별 추이
 * 필터(DateRangeControls)는 `오늘-7` 이상이라 오늘 포함 **8일**("30일"은 31일),
 * 그래서 같은 글의 "지난 7일" 합이 개요와 아코디언 차트에서 하루치씩 달랐다.
 * 두 화면이 이 함수 하나로 창을 잡는다. (파생 통계의 "7일 증감"은 진행 중인
 * 오늘을 일부러 빼는 별도 지표다 — derivedStats.ts 주석.)
 *
 * 이 모듈은 `@blog/content`의 순수 날짜 헬퍼만 쓴다 — 저장소를 열지 않으므로
 * admin 배럴(모듈 최상위에서 supabase 클라이언트를 바인딩) 없이 직접 열어도 된다.
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
