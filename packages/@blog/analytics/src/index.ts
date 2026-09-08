/**
 * `@blog/analytics` 공개 API — 조회수·대시보드 도메인.
 *
 * `apps/blog/web`의 `src/domain/analytics`·`src/domain/auth/repository`·
 * `src/lib/platform`에서 떼어 냈다. **옮기면서 고친 것은 배선 하나뿐이고**,
 * 계산·계약·검증은 글자 그대로 왔다 — 이 코드에는 원래 React도 Next도 없었다
 * (2,560줄 중 `react`·`next/`를 import하는 줄이 0이었다). 프레임워크에 묶여
 * 있던 것은 **클라이언트를 어디서 만드는가** 하나였고, 그건 URL과 키를
 * `process.env.NEXT_PUBLIC_*`에서 읽는 앱의 일이다. 그래서 저장소 둘이
 * 싱글톤 import 대신 팩토리가 됐다.
 *
 * ## 무엇이 여기 없는가
 *
 * - **클라이언트 생성** — `createClient`·`PostgrestClient`의 URL·키는 앱이 읽어
 *   `createPublicAnalytics(db)`·`new AdminApiClient(client)`로 넘긴다
 * - **싱글톤** — 앱의 배럴이 만든다. 이 패키지에 모듈 최상위 `new`가 없어야
 *   번들러가 부수효과로 보지 않는다(공개 페이지 청크에 supabase-js가 실렸던
 *   이력이 `adminRepository.ts` 주석에 있다)
 * - **관리자 이메일 판정** — `NEXT_PUBLIC_ADMIN_EMAIL` 기본값이 붙어 있어
 *   앱에 남겼다(`src/domain/auth/adminAccess.ts`). 실제 강제는 Edge Function이
 *   호출자 JWT를 진짜 시크릿과 대조하며 한다
 *
 * ## 런타임 의존이 없다
 *
 * `@supabase/*`는 **타입으로만** 쓴다(`import type`). 주입받은 객체를 부를 뿐
 * 아무것도 만들지 않기 때문이다. 값으로 여는 것은 `@blog/content/client`(KST
 * 날짜 계산·`isRecord`)뿐이고, 그것도 배럴이 아니라 **클라이언트 문**이다 — 배럴은
 * `node:fs`를 함께 열어서, 이 패키지가 클라이언트 그래프에 실리는 순간
 * 브라우저용 빈 스텁으로 externalize된다.
 */

// ── 계약·타입 ────────────────────────────────────────────────────────────────
export type { Database, Tables } from './database.types.ts';
export * from './types.ts';
export type { AdminAction, AdminActionParams } from './adminActions.ts';
export { ADMIN_ACTION_RPC, isAdminAction } from './adminActions.ts';

// ── 순수 계산 ────────────────────────────────────────────────────────────────
export { percentDelta } from './delta.ts';
export {
  UNIQUES_ESTIMATE_RATIO,
  computeAnalyticsOverview,
} from './overview.ts';
export type {
  AnalyticsOverview,
  AnalyticsRange,
  TopPostSummary,
} from './overview.ts';
export { computeDerivedStats } from './derivedStats.ts';
export { AnalyticsService } from './service.ts';
export type { AnalyticsCalculator } from './service.ts';

// ── 데이터 접근 (클라이언트 주입) ────────────────────────────────────────────
export { collectPagedRows } from './paging.ts';
export { AdminApiClient } from './adminApi.ts';
export type {
  AdminApi,
  AdminActionResult,
  FunctionsInvoker,
} from './adminApi.ts';
export { createPublicAnalytics } from './publicRepository.ts';
export type { PublicAnalytics } from './publicRepository.ts';
export { createAdminAnalytics } from './adminRepository.ts';
export type { AdminAnalytics, AdminPostIndex } from './adminRepository.ts';
export { AuthRepository } from './authRepository.ts';
export type {
  AdminSession,
  AuthApi,
  AuthFailure,
  AuthOAuthResult,
} from './authRepository.ts';
