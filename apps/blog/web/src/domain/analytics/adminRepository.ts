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
import { isRecord, type PostStatus } from '@blog/content';
import type {
  PostStatsRow,
  PostTrendRow,
  HourlyDistribution,
  DowDistribution,
} from './types';

// admin-posts-index.json 산출물의 행 계약 부분집합 — 필드 정의의 출처는
// @blog/content의 generate-search-index.ts(AdminPostsIndexEntry)다. 여기에는
// admin 화면이 실제로 읽는 축만 든다. 산출물에 있는데 이 타입에 없는 필드가
// 필요해지면 여기 늘릴 것 — 예전 태그 분포 훅이 이 타입에 tags가 없다는
// 이유로 src에서 같은 파일을 따로 fetch(타입까지 재선언)했다.
export interface AdminPostIndex {
  slug: string;
  title: string;
  date: string | null;
  tags: string[];
  status: PostStatus;
  scheduledDate: string | null;
}

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
// 아니다). 그래서 Number() 는 형변환이 아니라 null 방어로만 값을 한다. RPC 넷 중
// 그 방어가 필요한 축은 get_all_post_stats.total_views 하나뿐이다:
// post_views.view_count(nullable)를 coalesce 없이 그대로 내보내는데 RETURNS TABLE
// 이 bigint 라 생성 타입은 non-null number 다. 나머지는 SQL 이 coalesce(...,0) 이나
// count(*)/extract()::int 로 이미 not-null 을 보장한다.

export async function getAllPostStats(): Promise<PostStatsRow[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  const data = await adminApi().call('all_post_stats');
  // null 이 오면 Number(null) === 0 으로 굳어 소비처의 산술이 NaN 으로 번지지 않는다.
  return data.map(s => ({ ...s, total_views: Number(s.total_views) }));
}

export async function getAllPostsTrends(): Promise<PostTrendRow[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  // PostgREST의 1000행 cap 페이징은 Edge Function 안에서 돈다(왕복 1회).
  return adminApi().call('all_posts_trends');
}

/**
 * 응답 행이 AdminPostIndex 모양인지 — 산출물 검증은 이 저장소의 일이다.
 * 소비자(useSuspenseQuery 훅들)는 throw가 곧 페이지 전체 ErrorBoundary라,
 * 손으로 고쳐진 파일이나 형식이 어긋난 배포에 화면째 깨지면 안 된다.
 */
function isAdminPostIndexRow(row: unknown): row is AdminPostIndex {
  if (!isRecord(row)) return false;
  return (
    typeof row['slug'] === 'string' &&
    typeof row['title'] === 'string' &&
    // date는 소비처(useAdminViews)가 폴백 없이 화면에 그대로 쓰므로 모양을
    // 확인한다. status는 문자열이면 충분 — enum 값 검사까지 하면 발행 상태가
    // 늘어날 때 여기가 조용한 필터가 된다(소비처는 문자열 비교·폴백만 함).
    (typeof row['date'] === 'string' || row['date'] === null) &&
    typeof row['status'] === 'string' &&
    (typeof row['scheduledDate'] === 'string' ||
      row['scheduledDate'] === null) &&
    Array.isArray(row['tags']) &&
    row['tags'].every(t => typeof t === 'string')
  );
}

export async function getAdminPostsIndex(): Promise<AdminPostIndex[]> {
  // 서버 환경(SSG prerender 포함)에서는 상대 URL fetch가 ERR_INVALID_URL.
  // 어차피 admin은 클라이언트 hydration 후에만 유효하므로 SSR에선 빈 배열로 대기.
  if (typeof window === 'undefined') return [];
  const res = await fetch('/admin-posts-index.json');
  if (!res.ok) {
    throw new Error(
      `admin-posts-index.json fetch failed: ${res.status} ${res.statusText}`,
    );
  }
  // 배열이 아니거나 모양이 어긋난 행은 조용히 거른다 — 검증이 여기 한 곳에
  // 있어야 소비자마다 방어 코드가 다시 자라지 않는다(예전 태그 분포 훅이
  // 자기 가드를 따로 들고 있었다).
  const json: unknown = await res.json();
  return Array.isArray(json) ? json.filter(isAdminPostIndexRow) : [];
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
