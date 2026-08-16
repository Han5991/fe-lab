'use client';

import { useState, useEffect } from 'react';
import { useAdminDashboardData } from './useAdminViews';
import { getKSTDateISO, msUntilKSTMidnight } from '@/lib/shared/dates';
import {
  computeAnalyticsOverview,
  UNIQUES_ESTIMATE_RATIO,
} from '@/domain/analytics';
import type { AnalyticsRange } from '@/domain/analytics';

export { UNIQUES_ESTIMATE_RATIO };

/**
 * Supabase admin dashboard 데이터를 가공해 Analytics 페이지에서 쓰는 형태로 반환.
 *
 * todayISO는 KST 자정 경계에서 리셋되는 state로 관리합니다. 오늘 날짜를 렌더
 * 시점에 즉석에서 읽으면 자정을 넘겨도 화면이 stale 윈도우에 머무르므로,
 * state로 두어 자정에 리렌더가 걸리게 합니다.
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

  return computeAnalyticsOverview(data, range, todayISO);
}
