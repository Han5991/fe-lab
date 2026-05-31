/**
 * Analytics 도메인의 Supabase / 정적 자원 접근 layer.
 *
 * 컴포넌트와 React 훅은 Supabase client를 직접 호출하지 않고
 * 이 모듈의 함수만 사용합니다.
 *
 * admin RPC 4건(getAllPostStats, getAllPostsTrends, getPostHourlyDistribution,
 * getPostDowDistribution)은 PR #114에서 service_role 한정으로 lockdown 되었기 때문에
 * anon key로 직접 호출할 수 없습니다. admin-analytics Edge Function을 경유합니다.
 */

import { client } from '@/lib/client';
import { createAdminApiClient } from '@/lib/adminApi';
import type { PostStatus } from '@/domain/post/types';
import type { HourlyDistribution, DowDistribution } from './types';

/** admin-analytics Edge Function 클라이언트 (싱글턴) */
const adminApi = createAdminApiClient(client);

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

export interface TopPostRow {
  slug: string;
  view_count: number;
}

export async function getTopPosts(limit: number): Promise<TopPostRow[]> {
  const { data } = await client
    .from('post_views')
    .select('slug, view_count')
    .order('view_count', { ascending: false })
    .limit(limit);
  return (data ?? []).map(d => ({
    slug: d.slug,
    view_count: d.view_count ?? 0,
  }));
}

/**
 * 모든 글의 조회수를 반환합니다(정렬/limit 없음).
 * PostsArchive의 '인기순' 정렬처럼 전체 slug→view_count 맵이 필요할 때 사용합니다.
 *
 * post_views는 글당 1행이므로 PostgREST의 1000-row cap에 닿으려면 글이 1000편을
 * 넘어야 합니다(getAllPostsTrends와 달리 post×day가 아님). 그 전까지는 페이지네이션
 * 불필요. 1000편을 넘기면 range 페이지네이션을 추가해야 합니다.
 */
export async function getAllViewCounts(): Promise<TopPostRow[]> {
  const { data } = await client.from('post_views').select('slug, view_count');
  return (data ?? []).map(d => ({
    slug: d.slug,
    view_count: d.view_count ?? 0,
  }));
}

export async function getAllPostStats(): Promise<PostStatsRow[]> {
  // admin RPC — service_role 한정. Edge Function 경유.
  const data = await adminApi.call<PostStatsRow[]>('all_post_stats');
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
    const data = await adminApi.call<PostTrendRow[]>('all_posts_trends', {
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
  const data = await adminApi.call<HourlyDistribution[]>(
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
  const data = await adminApi.call<DowDistribution[]>('post_dow_distribution', {
    slug,
  });
  if (!data) return [];
  return data.map(d => ({
    dow: Number(d.dow),
    view_count: Number(d.view_count),
  }));
}

export async function incrementViewCount(slug: string): Promise<void> {
  const { error } = await client.rpc('increment_view_count', {
    slug_input: slug,
  });
  if (error) throw error;
}
