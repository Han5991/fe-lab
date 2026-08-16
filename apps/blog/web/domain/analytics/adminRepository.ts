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

import { client } from '@/lib/platform/client';
import {
  createAdminApiClient,
  type AdminApiClient,
} from '@/lib/platform/adminApi';
import type { PostStatus } from '@/domain/post/types';
import type { HourlyDistribution, DowDistribution } from './types';

export interface AdminPostIndex {
  slug: string;
  title: string;
  date: string | null;
  status: PostStatus;
  scheduledDate: string | null;
}

export interface PostStatsRow {
  slug: string;
  total_views: number;
  today_views: number;
}

export interface PostTrendRow {
  slug: string;
  view_date: string;
  view_count: number;
}

/** admin-analytics Edge Function 클라이언트 (첫 호출 때 1회 생성) */
let adminApiInstance: AdminApiClient | null = null;
function adminApi(): AdminApiClient {
  adminApiInstance ??= createAdminApiClient(client);
  return adminApiInstance;
}

export async function getAllPostStats(): Promise<PostStatsRow[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  const data = await adminApi().call<PostStatsRow[]>('all_post_stats');
  return (data ?? []).map(s => ({
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
    const data = await adminApi().call<PostTrendRow[]>('all_posts_trends', {
      range: [from, from + PAGE - 1] as [number, number],
    });
    const rows = data ?? [];
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
  const data = await adminApi().call<HourlyDistribution[]>(
    'post_hourly_distribution',
    { slug },
  );
  if (!data) return [];
  return data.map(h => ({
    hour: Number(h.hour),
    view_count: Number(h.view_count),
  }));
}

export async function getPostDowDistribution(
  slug: string,
): Promise<DowDistribution[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  const data = await adminApi().call<DowDistribution[]>(
    'post_dow_distribution',
    { slug },
  );
  if (!data) return [];
  return data.map(d => ({
    dow: Number(d.dow),
    view_count: Number(d.view_count),
  }));
}
