/**
 * Analytics domain의 **admin 전용** 공개 API — 이 앱의 배선이다.
 *
 * 공개 배럴(`@/src/domain/analytics`)과 일부러 분리했습니다. 한 배럴에서 둘 다
 * re-export하면, 공개 페이지가 admin 함수를 안 쓰더라도 번들러가 인증 세션용
 * supabase-js를 떨궈내지 못했습니다(실측: 홈 청크에 GoTrueClient·RealtimeClient가
 * 그대로 남음). `lib/platform/client.ts`의 모듈 최상위 `createClient()` 호출이
 * 부수효과라 그래프에 닿기만 하면 통째로 유지되기 때문입니다.
 *
 * 배럴을 나누면 모듈 그래프 자체가 갈라져 트리셰이킹 품질에 기대지 않아도 됩니다.
 * admin 화면은 이 배럴을, 그 외에는 `@/src/domain/analytics`를 씁니다.
 * 누수가 실제로 없는지는 `check-bundle`의 admin 규칙 다섯이 산출물에서 봅니다.
 */

import { client } from '../../lib/platform/client';
import {
  AdminApiClient,
  AnalyticsService,
  createAdminAnalytics,
  type AnalyticsCalculator,
} from '@blog/analytics';

/**
 * 이 앱의 admin 저장소 — 세션이 붙은 supabase 클라이언트를 Edge Function
 * 클라이언트로 감싸 꽂는다. 이 파일은 admin 화면에서만 열리므로 모듈 최상위
 * 생성이 공개 페이지 그래프에 닿지 않는다.
 */
export const {
  getAllPostStats,
  getAllPostsTrends,
  getAdminPostsIndex,
  getPostHourlyDistribution,
  getPostDowDistribution,
} = createAdminAnalytics(new AdminApiClient(client));

/**
 * 이 앱의 analytics 계산기 — 모듈이 처음 열릴 때 만들어 두는 싱글톤.
 *
 * 상태가 없어 인스턴스가 여럿이어도 결과는 같지만, 저장소(`authRepository`)와
 * 같은 모양으로 하나만 둔다. 타입을 클래스가 아니라 계약(`AnalyticsCalculator`)
 * 으로 못 박는 것도 같은 이유다.
 *
 * 공개 배럴(index.ts)이 아니라 여기 있는 이유: 모듈 최상위 `new`는 번들러에
 * 부수효과라(adminApi.ts의 경고와 같은 함정), 공개 배럴에 두자 홈·글 목록·
 * 글 상세 청크에 파사드와 계산 모듈(overview·derivedStats)이 통째로 실렸다
 * (실측 +4KB). 소비자(useAnalyticsOverview·usePostDetailStats)는 admin 화면
 * 전용이라 이 배럴이 제자리다.
 */
export const analyticsService: AnalyticsCalculator = new AnalyticsService();

export type { AdminPostIndex } from '@blog/analytics';
// PostStatsRow·PostTrendRow는 DB 행 타입이라 공개 배럴로도 나간다. 타입뿐이라
// 런타임 모듈 그래프(위 주석의 번들 분리)에는 영향이 없다.
export type { PostStatsRow, PostTrendRow } from '@blog/analytics';
