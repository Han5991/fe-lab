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
export type { TopPostRow } from './repository';
