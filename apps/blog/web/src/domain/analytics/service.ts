/**
 * Analytics 계산의 공개 표면 — 개요(`overview.ts`)와 글별 파생 통계(`derivedStats.ts`)에
 * 위임만 하는 파사드다. 주입할 의존이 없다: 계산은 인자(`todayISO`·`visibility`)만 받는다.
 */

import { computeAnalyticsOverview } from './overview';
import { computeDerivedStats } from './derivedStats';
import type { AnalyticsOverview, AnalyticsRange } from './overview';
import type {
  DerivedStats,
  PostStatDetail,
  PostVisibilityContext,
} from './types';

/**
 * Analytics 계산 계약. **소비자는 클래스가 아니라 이 인터페이스에 의존한다**
 * (`AuthApi`·`AdminApi`와 같은 관례).
 */
export interface AnalyticsCalculator {
  /** 대시보드 개요 — 기간 합계·증감·상위 글·공개 글 수. */
  computeOverview(
    data: PostStatDetail[],
    range: AnalyticsRange,
    todayISO: string,
    visibility: PostVisibilityContext,
  ): AnalyticsOverview;

  /** 글 하나의 파생 통계 — 주간 성장률·피크·일 평균·마일스톤. */
  computeDerivedStats(post: PostStatDetail, todayISO: string): DerivedStats;
}

export class AnalyticsService implements AnalyticsCalculator {
  computeOverview(
    data: PostStatDetail[],
    range: AnalyticsRange,
    todayISO: string,
    visibility: PostVisibilityContext,
  ): AnalyticsOverview {
    return computeAnalyticsOverview(data, range, todayISO, visibility);
  }

  computeDerivedStats(post: PostStatDetail, todayISO: string): DerivedStats {
    return computeDerivedStats(post, todayISO);
  }
}
