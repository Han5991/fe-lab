import {
  AdminApiClient,
  AnalyticsService,
  AuthRepository,
  createAdminAnalytics,
} from '@blog/analytics';
import type { AnalyticsCalculator, AuthApi } from '@blog/analytics';
import { client } from '$lib/platform/client';

/**
 * Admin 전용 배선 — **공개 배럴(`analytics.ts`)과 일부러 분리한다.**
 *
 * 한 파일에서 둘 다 내보내면 조회수만 읽는 글 페이지도 인증 세션용 supabase-js를
 * 받는다. `client.ts`의 최상위 `createClient()`가 부수효과라 그래프에 닿기만
 * 하면 통째로 유지되기 때문이다 — 트리셰이킹 품질에 기대는 대신 모듈 그래프를
 * 갈라 둔다. React 판이 `index`·`admin` 두 배럴로 같은 일을 하고, 실제로
 * 갈라졌는지는 양쪽 `check-bundle`이 산출물에서 본다.
 *
 * 이 파일은 admin 라우트에서만 열린다.
 */
export const {
  getAllPostStats,
  getAllPostsTrends,
  getAdminPostsIndex,
  getPostHourlyDistribution,
  getPostDowDistribution,
} = createAdminAnalytics(new AdminApiClient(client));

export const analyticsService: AnalyticsCalculator = new AnalyticsService();
export const authRepository: AuthApi = new AuthRepository(client.auth);
