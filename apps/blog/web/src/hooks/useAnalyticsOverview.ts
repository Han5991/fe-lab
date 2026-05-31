'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAdminDashboardData } from './useAdminViews';
import { getKSTDateISO } from '@/lib/dates';
import {
  computeAnalyticsOverview,
  UNIQUES_ESTIMATE_RATIO,
} from '@/domain/analytics';
import type { AnalyticsRange } from '@/domain/analytics';

export type { AnalyticsRange };
export { UNIQUES_ESTIMATE_RATIO };
export type { AnalyticsOverview } from '@/domain/analytics';

/**
 * KST 자정까지 남은 밀리초를 계산합니다.
 * 자정 + 60s 여유를 두어 날짜 전환 직후 확실히 트리거됩니다.
 */
function msUntilKSTMidnight(now: Date = new Date()): number {
  // KST 기준 다음 자정 = UTC 기준 (오늘 15:00 또는 내일 15:00)
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간
  const nowKST = now.getTime() + kstOffset;
  const midnightKST = Math.ceil(nowKST / 86400000) * 86400000;
  // 여유 60초 추가: 자정 정각에 OS 타이머가 약간 일찍 발화하는 경우 대비
  return midnightKST - nowKST + 60_000;
}

/**
 * Supabase admin dashboard 데이터를 가공해 Analytics 페이지에서 쓰는 형태로 반환.
 *
 * todayISO는 KST 자정 경계에서 리셋되는 state로 관리합니다.
 * [data, range]만 deps로 쓰면 자정 넘어도 useMemo가 stale 윈도우를 반환하는
 * 버그를 방지합니다.
 */
export function useAnalyticsOverview(range: AnalyticsRange) {
  const { data } = useAdminDashboardData();

  // KST 기준 오늘 날짜를 state로 관리. 자정마다 setTimeout으로 갱신합니다.
  const [todayISO, setTodayISO] = useState<string>(() => getKSTDateISO());

  useEffect(() => {
    // cancelled flag 패턴: 재귀 setTimeout의 timeoutId 덮어쓰기로 인한
    // cleanup 누락(unmount 직후 새 timer가 setTodayISO 호출)을 방지합니다.
    let cancelled = false;

    function scheduleNextMidnight() {
      const ms = msUntilKSTMidnight();
      setTimeout(() => {
        if (cancelled) return;
        setTodayISO(getKSTDateISO());
        scheduleNextMidnight(); // 다음 자정도 예약
      }, ms);
    }

    scheduleNextMidnight();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => computeAnalyticsOverview(data, range, todayISO),
    [data, range, todayISO],
  );
}
