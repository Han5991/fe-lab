/**
 * Analytics domain 공개 API
 *
 * 외부(컴포넌트·훅)는 이 배럴을 통해서만 접근합니다. repository.ts(인프라)를
 * 직접 import하지 않습니다 — eslint no-restricted-imports로 강제됩니다.
 * post 도메인과 동일한 캡슐화 정책을 따릅니다.
 */

// 도메인 모델 타입
export * from './types';

// 순수 계산(use-case) + 공유 타입(AnalyticsRange, AnalyticsOverview 등)
export * from './service';

// 데이터 접근(Supabase / Edge Function / 정적 JSON). 의도적으로 공개하는 함수만 노출.
export {
  getTopPosts,
  getAllViewCounts,
  getAllPostStats,
  getAllPostsTrends,
  getAdminPostsIndex,
  getPostHourlyDistribution,
  getPostDowDistribution,
  incrementViewCount,
} from './repository';
export type {
  AdminPostIndex,
  PostStatsRow,
  PostTrendRow,
  TopPostRow,
} from './repository';
