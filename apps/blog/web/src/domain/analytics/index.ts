/**
 * Analytics domain 공개 API — **이 앱의 배선**이다.
 *
 * 계산·계약·검증은 전부 `@blog/analytics`로 떼어졌고(그 패키지에는 React도
 * Next도 없다), 여기 남은 일은 하나다: **이 앱의 Supabase 클라이언트를 꽂는
 * 것.** URL과 키를 `process.env.NEXT_PUBLIC_*`에서 읽는 것이 앱의 일이라
 * 패키지는 클라이언트를 만들지 않고 받는다.
 *
 * 외부(컴포넌트·훅)는 이 배럴을 통해서만 접근합니다 — 패키지를 직접 열지
 * 않습니다. eslint no-restricted-imports로 강제됩니다.
 */

import { publicDb } from '../../lib/platform/publicClient';
import { createPublicAnalytics, type PublicAnalytics } from '@blog/analytics';

// 도메인 모델 타입 + DB 행 타입(TopPostRow·PostStatsRow·PostTrendRow·
// HourlyDistribution·DowDistribution — database.types.ts에서 파생)
//
// 패키지의 **타입 전용 문**에서 `export *`로 받는다. 이름을 손으로 나열하면
// 패키지에 타입이 하나 늘 때 이 배럴에만 조용히 도착하지 않는데, 아무도 그걸
// 알려 주지 않는다(초안이 그랬다). 큰 배럴(`@blog/analytics`)로 `export *`를
// 하지 않는 이유는 그쪽에 admin 저장소·세션 클래스가 함께 있어서다.
export * from '@blog/analytics/types';

// 순수 계산(use-case) — 개요·글별 파생 통계. 계산 함수 자체는 배럴 밖으로
// 내보내지 않는다: 소비자가 붙는 문은 admin 배럴의 싱글톤(`analyticsService`)
// 하나다.
//
// 싱글톤이 여기 없는 것은 의도다. 모듈 최상위 `new`는 번들러에 부수효과라
// (adminApi.ts가 경고하는 그 함정), 이 배럴을 여는 공개 페이지(홈·글 목록·
// 글 상세) 청크에 파사드와 계산 모듈이 통째로 실렸다(실측 +4KB). 소비자가
// admin 훅뿐이므로 생성은 admin.ts가 한다. 여기서 다시 내보내지도 말 것 —
// re-export만으로 모듈 그래프가 도로 이어진다.
export type {
  AnalyticsRange,
  AnalyticsOverview,
  TopPostSummary,
  AnalyticsCalculator,
} from '@blog/analytics';
export { UNIQUES_ESTIMATE_RATIO } from '@blog/analytics';

// 데이터 접근(PostgREST). 의도적으로 공개하는 함수만 노출.
//
// admin 전용 함수는 여기 없습니다 — `@/src/domain/analytics/admin` 배럴로 나갔습니다.
// 한 배럴에 두면 공개 페이지 번들에 인증 세션용 supabase-js가 따라붙습니다
// (이유는 admin.ts 주석 참고). 이 배럴은 익명 권한으로 되는 것만 담습니다.
//
//
// **모듈 최상위에서 팩토리를 부르지 않는다.** 이 배럴은 공개 페이지가 여는
// 문이라 최상위 부수효과(`new`·호출)를 금지한다 —
// `eslint.config.mts`의 no-restricted-syntax가 이 파일에만 거는 규칙이고,
// 이유는 위 문단(+4KB 실측)과 같다. 첫 호출 때 한 번 만들고, 내보내는 것은
// 각자 떼어 낼 수 있는 평범한 함수다.
let repository: PublicAnalytics | null = null;
const repo = (): PublicAnalytics =>
  (repository ??= createPublicAnalytics(publicDb));

export const getTopPosts = (limit: number) => repo().getTopPosts(limit);
export const getAllViewCounts = () => repo().getAllViewCounts();
export const incrementViewCount = (slug: string) =>
  repo().incrementViewCount(slug);
