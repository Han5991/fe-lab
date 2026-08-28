/**
 * Analytics 계산의 공개 표면 — 개요와 글별 파생 통계를 한 문으로 낸다.
 *
 * 계산 자체는 `overview.ts`·`derivedStats.ts`가 하고 여기는 위임만 한다.
 * 두 파일을 나눈 이유는 입력도 소비자도 다르기 때문이고(N개 글 × 기간 ↔
 * 글 하나 × 전 기간), 그래도 한 문으로 내는 이유는 admin 화면 입장에서 둘 다
 * "이 대시보드의 계산"이기 때문이다. 실제로 둘 다 `src/app/admin/**`에서만
 * 쓰여 같은 청크에 실린다 — 나눠 내도 번들이 갈리지 않는다.
 *
 * **주의: 이 클래스에는 주입할 의존이 없다.** 저장소(`AuthRepository`·
 * `AdminApiClient`)의 생성자 주입은 supabase 클라이언트를 갈아 끼우기 위한
 * 것이지만, 여기 계산은 인자만 받는 순수 함수다. 클래스는 저장소와 **모양을
 * 맞추기 위한 파사드**이고, 테스트 가능성은 원래부터 인자 주입
 * (`todayISO`)이 담당한다. 시계를 생성자로 올리지 않은 것도 그래서다 —
 * KST 판정에 필요한 타임존은 앱 값 모듈이 소유하고 이 레이어는 설정을 모른다.
 */

import { computeAnalyticsOverview } from './overview';
import { computeDerivedStats } from './derivedStats';
import type { AnalyticsOverview, AnalyticsRange } from './overview';
import type { DerivedStats, PostStatDetail } from './types';

/**
 * Analytics 계산 계약. **소비자는 클래스가 아니라 이 인터페이스에 의존한다**
 * (`AuthApi`·`AdminApi`와 같은 관례).
 */
export interface AnalyticsCalculator {
  /** 대시보드 개요 — 기간 합계·증감·상위 글. */
  computeOverview(
    data: PostStatDetail[],
    range: AnalyticsRange,
    todayISO: string,
  ): AnalyticsOverview;

  /** 글 하나의 파생 통계 — 주간 성장률·피크·일 평균·마일스톤. */
  computeDerivedStats(post: PostStatDetail, todayISO: string): DerivedStats;
}

export class AnalyticsService implements AnalyticsCalculator {
  computeOverview(
    data: PostStatDetail[],
    range: AnalyticsRange,
    todayISO: string,
  ): AnalyticsOverview {
    return computeAnalyticsOverview(data, range, todayISO);
  }

  computeDerivedStats(post: PostStatDetail, todayISO: string): DerivedStats {
    return computeDerivedStats(post, todayISO);
  }
}
