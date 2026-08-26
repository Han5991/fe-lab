/**
 * Analytics domain 공개 API
 *
 * 외부(컴포넌트·훅)는 이 배럴을 통해서만 접근합니다. repository.ts(인프라)를
 * 직접 import하지 않습니다 — eslint no-restricted-imports로 강제됩니다.
 * post 도메인과 동일한 캡슐화 정책을 따릅니다.
 */

// 도메인 모델 타입 + DB 행 타입(TopPostRow·PostStatsRow·PostTrendRow·
// HourlyDistribution·DowDistribution — database.types.ts에서 파생)
export * from './types';

// 순수 계산(use-case) — 개요·글별 파생 통계. 계산 모듈(`overview`·`derivedStats`)은
// 배럴 밖으로 내보내지 않는다: 소비자가 붙는 문은 아래 싱글톤 하나다.
export type {
  AnalyticsRange,
  AnalyticsOverview,
  TopPostSummary,
} from './overview';
export { UNIQUES_ESTIMATE_RATIO } from './overview';
export type { AnalyticsCalculator } from './service';

import { AnalyticsService, type AnalyticsCalculator } from './service';

/**
 * 이 앱의 analytics 계산기 — 모듈이 처음 열릴 때 만들어 두는 싱글톤.
 *
 * 상태가 없어 인스턴스가 여럿이어도 결과는 같지만, 저장소(`authRepository`)와
 * 같은 모양으로 하나만 둔다. 타입을 클래스가 아니라 계약(`AnalyticsCalculator`)
 * 으로 못 박는 것도 같은 이유다.
 */
export const analyticsService: AnalyticsCalculator = new AnalyticsService();

// 데이터 접근(PostgREST). 의도적으로 공개하는 함수만 노출.
//
// admin 전용 함수는 여기 없습니다 — `@/domain/analytics/admin` 배럴로 나갔습니다.
// 한 배럴에 두면 공개 페이지 번들에 인증 세션용 supabase-js가 따라붙습니다
// (이유는 admin.ts 주석 참고). 이 배럴은 익명 권한으로 되는 것만 담습니다.
export {
  getTopPosts,
  getAllViewCounts,
  incrementViewCount,
} from './repository';
