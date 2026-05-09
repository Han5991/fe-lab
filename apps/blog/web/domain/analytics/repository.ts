/**
 * Analytics 도메인의 Supabase / 정적 자원 접근 layer.
 *
 * 컴포넌트와 React 훅은 Supabase client를 직접 호출하지 않고
 * 이 모듈의 함수만 사용합니다.
 */

import { client } from '@/lib/client';
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

export async function getAllPostStats(): Promise<PostStatsRow[]> {
  const { data, error } = await client.rpc('get_all_post_stats');
  if (error) throw error;
  return (data ?? []).map(s => ({
    slug: s.slug,
    total_views: Number(s.total_views),
    today_views: Number(s.today_views),
  }));
}

export async function getAllPostsTrends(): Promise<PostTrendRow[]> {
  const { data, error } = await client.rpc('get_all_posts_trends');
  if (error) throw error;
  return (data ?? []).map(t => ({
    slug: t.slug,
    view_date: t.view_date,
    view_count: Number(t.view_count),
  }));
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
  const { data, error } = await client.rpc('get_post_hourly_distribution', {
    slug_input: slug,
  });
  if (error || !data) return [];
  return data.map(h => ({
    hour: Number(h.hour),
    view_count: Number(h.view_count),
  }));
}

export async function getPostDowDistribution(
  slug: string,
): Promise<DowDistribution[]> {
  const { data, error } = await client.rpc('get_post_dow_distribution', {
    slug_input: slug,
  });
  if (error || !data) return [];
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
