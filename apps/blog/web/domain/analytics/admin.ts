/**
 * Analytics domain의 **admin 전용** 공개 API
 *
 * 공개 배럴(`@/domain/analytics`)과 일부러 분리했습니다. 한 배럴에서 둘 다
 * re-export하면, 공개 페이지가 admin 함수를 안 쓰더라도 번들러가 인증 세션용
 * supabase-js를 떨궈내지 못했습니다(실측: 홈 청크에 GoTrueClient·RealtimeClient가
 * 그대로 남음). `lib/platform/client.ts`의 모듈 최상위 `createClient()` 호출이 부수효과라
 * adminRepository가 그래프에 닿기만 하면 통째로 유지되기 때문입니다.
 *
 * 배럴을 나누면 모듈 그래프 자체가 갈라져 트리셰이킹 품질에 기대지 않아도 됩니다.
 * admin 화면은 이 배럴을, 그 외에는 `@/domain/analytics`를 씁니다.
 */

export {
  getAllPostStats,
  getAllPostsTrends,
  getAdminPostsIndex,
  getPostHourlyDistribution,
  getPostDowDistribution,
} from './adminRepository';

export type { AdminPostIndex } from './adminRepository';
// PostStatsRow·PostTrendRow는 DB 행 타입이라 types.ts에 있고, 공개 배럴
// (`@/domain/analytics`)의 `export * from './types'`로도 나간다. 타입뿐이라
// 런타임 모듈 그래프(위 주석의 번들 분리)에는 영향이 없다.
export type { PostStatsRow, PostTrendRow } from './types';
