import { createPublicAnalytics } from '@blog/analytics';
import type { PublicAnalytics } from '@blog/analytics';
import { publicDb } from '$lib/platform/publicClient';

/**
 * 공개 페이지가 여는 문 — **이 앱의 배선**이다.
 *
 * 계산·계약·저장소는 `@blog/analytics`에 있고, 여기 남은 일은 이 앱의 Supabase
 * 클라이언트를 꽂는 것 하나다. `apps/blog/web`의 `src/domain/analytics/index.ts`와
 * 같은 자리고, 하는 일도 같다 — 그 패키지에 프레임워크가 없다는 것이 이 파일이
 * 스물몇 줄인 이유다.
 *
 * **모듈 최상위에서 팩토리를 부르지 않는다.** 이 문은 글 페이지가 여는데,
 * 최상위 호출은 번들러에 부수효과라 청크가 갈라지지 않는다. 첫 호출 때 한 번
 * 만들고 내보내는 것은 각자 떼어 낼 수 있는 평범한 함수다(React 판과 같은 규칙).
 */
let repository: PublicAnalytics | null = null;
const repo = (): PublicAnalytics =>
  (repository ??= createPublicAnalytics(publicDb));

// 공개 화면이 실제로 쓰는 셋만 연다. 아카이브가 '인기순' 정렬과 인기 글 레일을
// 갖추면서 조회수 읽기 둘이 더 열렸다 — 쓰지 않는 문을 미리 열어 두지 않는
// 규칙은 그대로다(열어 두면 "이 배럴이 무엇을 위한 것인가"가 흐려진다).
export const incrementViewCount = (slug: string) =>
  repo().incrementViewCount(slug);

/** 인기 글 레일 — 상위 `limit`편. */
export const getTopPosts = (limit: number) => repo().getTopPosts(limit);

/**
 * 아카이브의 '인기순' 정렬 — 전체 slug→조회수. 그 정렬을 고르기 전에는 부르지
 * 않는다(React 판의 `enabled: sort === 'popular'`와 같은 늦춤).
 */
export const getAllViewCounts = () => repo().getAllViewCounts();
