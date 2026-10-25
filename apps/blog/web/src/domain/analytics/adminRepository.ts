/**
 * Analytics 도메인 중 **admin 전용** 데이터 접근 layer.
 *
 * 여기 있는 RPC 4건은 PR #114에서 service_role 한정으로 lockdown 되었기
 * 때문에 anon key로 직접 호출할 수 없고, admin-analytics Edge Function을
 * 경유합니다. 그래서 인증 세션이 붙은 `lib/platform/client.ts`(전체 supabase-js)가
 * 필요합니다.
 *
 * 공개 페이지용 함수(repository.ts)와 파일을 분리한 이유는 번들입니다.
 * 한 파일에 있으면 조회수만 읽는 홈·글 상세도 supabase-js 전체(gzip 45KB)를
 * 함께 받게 됩니다. 특히 예전에는 모듈 최상위에서 `createAdminApiClient(client)`를
 * 호출하고 있어서, 번들러가 부수효과로 보고 절대 떨궈내지 못했습니다.
 * 지금은 첫 호출 때 만들어 그 고정점도 없앴습니다.
 */

import { client } from '../../lib/platform/client';
import { AdminApiClient, type AdminApi } from '../../lib/platform/adminApi';
import {
  ADMIN_POSTS_INDEX_PATH,
  type AdminPostsIndexEntry,
  isAdminPostsIndexEntry,
} from '@blog/content/client';
import type {
  PostStatsRow,
  PostTrendRow,
  HourlyDistribution,
  DowDistribution,
} from './types';

/**
 * admin-analytics Edge Function 클라이언트 (첫 호출 때 1회 생성).
 *
 * 보관 타입이 `AdminApiClient`(클래스)가 아니라 `AdminApi`(계약)인 건 의도다 —
 * 이 파일이 의존하는 건 `call()` 하나이지 그 구현이 아니다.
 */
let adminApiInstance: AdminApi | null = null;
function adminApi(): AdminApi {
  adminApiInstance ??= new AdminApiClient(client);
  return adminApiInstance;
}

// 아래 함수들의 응답 타입은 call()이 action → RPC Returns로 추론한다
// (lib/platform/adminApi.ts). 행 타입을 여기서 다시 적지 않으므로, 행을 그대로
// 흘려보내면 될 뿐 필드를 옮겨 적는 map 은 필요 없다.
//
// bigint 도 마찬가지다 — PostgREST 는 이걸 JSON number 로 직렬화한다(문자열이
// 아니다). 응답 모양은 call()이 unknown에서 확인하고, 생성 타입보다 넓은 열
// (get_all_post_stats.total_views의 null)은 응답 타입이 그대로 말한다 — 아래에서
// 그 null을 0으로 읽는다고 보이게 고른다.

// 목록형 두 읽기는 글 인덱스의 slug로 서버에서 거른다 — anon이 만든 가짜 slug 행이
// 1000행 cap·페이지 상한을 채우지 않게(adminActions.ts의 AdminSlugFilter).

export async function getAllPostStats(
  slugs: readonly string[],
): Promise<PostStatsRow[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  // PostgREST의 1000행 cap 페이징은 Edge Function 안에서 돈다(왕복 1회).
  const data = await adminApi().call('all_post_stats', { slugs });
  // 조회 기록이 없는 글의 누적 조회수는 0이다 — null을 산술에 흘리지 않는다.
  return data.map(s => ({ ...s, total_views: s.total_views ?? 0 }));
}

export async function getAllPostsTrends(
  slugs: readonly string[],
): Promise<PostTrendRow[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  // Edge Function이 json 배열을 내는 RPC 한 번으로 받는다(왕복 1회, max_rows 페이징 없음).
  return adminApi().call('all_posts_trends', { slugs });
}

export async function getAdminPostsIndex(): Promise<AdminPostsIndexEntry[]> {
  // 서버 환경(SSG prerender 포함)에서는 상대 URL fetch가 ERR_INVALID_URL.
  // 어차피 admin은 클라이언트 hydration 후에만 유효하므로 SSR에선 빈 배열로 대기.
  if (typeof window === 'undefined') return [];
  const res = await fetch(ADMIN_POSTS_INDEX_PATH);
  if (!res.ok) {
    throw new Error(
      `${ADMIN_POSTS_INDEX_PATH} fetch failed: ${res.status} ${res.statusText}`,
    );
  }
  // 행 계약(타입·검사)은 만드는 쪽인 @blog/content가 소유한다. 색인은 화면과 같은 빌드가
  // 만들므로 어긋난 행은 버그다 — 거르거나 모르는 발행 상태를 다른 값으로 바꾸면 글이
  // 목록에서 조용히 빠지거나 다른 상태로 보인다. 그래서 통째로 실패시켜 에러 경계가 보인다.
  const json: unknown = await res.json();
  if (!Array.isArray(json)) {
    throw new Error(`${ADMIN_POSTS_INDEX_PATH}: 배열이 아닌 본문`);
  }
  const rows: readonly unknown[] = json;
  if (!rows.every(isAdminPostsIndexEntry)) {
    throw new Error(`${ADMIN_POSTS_INDEX_PATH}: 계약과 다른 행`);
  }
  return [...rows];
}

export async function getPostHourlyDistribution(
  slug: string,
): Promise<HourlyDistribution[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  return adminApi().call('post_hourly_distribution', { slug });
}

export async function getPostDowDistribution(
  slug: string,
): Promise<DowDistribution[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  return adminApi().call('post_dow_distribution', { slug });
}
