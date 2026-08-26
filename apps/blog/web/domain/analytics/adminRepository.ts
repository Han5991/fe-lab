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
import {
  createAdminApiClient,
  type AdminApiClient,
} from '../../lib/platform/adminApi';
import type { PostStatus } from '@blog/content';
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

/** admin-analytics Edge Function 클라이언트 (첫 호출 때 1회 생성) */
let adminApiInstance: AdminApiClient | null = null;
function adminApi(): AdminApiClient {
  adminApiInstance ??= createAdminApiClient(client);
  return adminApiInstance;
}

// 아래 함수들의 응답 타입은 call()이 action → RPC Returns로 추론한다
// (lib/platform/adminApi.ts). 행 타입을 여기서 다시 적지 않는다.
//
// Number()를 남겨 두는 이유: get_all_post_stats의 total_views는 nullable 컬럼
// (post_views.view_count)에서 오는데 RETURNS TABLE이 bigint로 선언돼 있어 생성
// 타입은 non-null `number`다. 실제 null이 오면 Number(null) === 0으로 굳어
// 소비처의 산술이 NaN으로 번지지 않는다.

export async function getAllPostStats(): Promise<PostStatsRow[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  const data = await adminApi().call('all_post_stats');
  return data.map(s => ({
    slug: s.slug,
    total_views: Number(s.total_views),
    today_views: Number(s.today_views),
  }));
}

export async function getAllPostsTrends(): Promise<PostTrendRow[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  // PostgREST 1000-row cap을 피하기 위해 range 페이지네이션을 Edge Function에 위임합니다.
  const all: PostTrendRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const rows = await adminApi().call('all_posts_trends', {
      range: [from, from + PAGE - 1],
    });
    all.push(
      ...rows.map(t => ({
        slug: t.slug,
        view_date: t.view_date,
        view_count: Number(t.view_count),
      })),
    );
    if (rows.length < PAGE) break;
  }
  return all;
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
  return (await res.json()) as AdminPostIndex[];
}

export async function getPostHourlyDistribution(
  slug: string,
): Promise<HourlyDistribution[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  const data = await adminApi().call('post_hourly_distribution', { slug });
  return data.map(h => ({
    hour: Number(h.hour),
    view_count: Number(h.view_count),
  }));
}

export async function getPostDowDistribution(
  slug: string,
): Promise<DowDistribution[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  const data = await adminApi().call('post_dow_distribution', { slug });
  return data.map(d => ({
    dow: Number(d.dow),
    view_count: Number(d.view_count),
  }));
}
