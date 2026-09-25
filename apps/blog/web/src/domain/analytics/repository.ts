/**
 * Analytics 도메인 중 공개 페이지가 쓰는 데이터 접근 layer — anon PostgREST만 쓴다
 * (admin RPC는 supabase-js 전체가 필요해 `adminRepository.ts`에 따로 있다).
 *
 * post_views의 slug는 anon RPC로 아무나 만들 수 있는 입력이라, 순위를 매기는 읽기는
 * 실제 글 slug로 서버에서 거른다. 읽기 실패는 던진다 — "조회수 없음"과 구분되게.
 */

import { publicDb } from '../../lib/platform/publicClient';
import type { TopPostRow } from './types';

function toTopPostRows(
  rows: readonly { slug: string; view_count: number | null }[] | null,
): TopPostRow[] {
  return (rows ?? []).map(d => ({
    slug: d.slug,
    view_count: d.view_count ?? 0,
  }));
}

/**
 * 조회수 상위 `limit`개 — 이 빌드의 slug 안에서 서버가 고른다(받은 뒤 거르면 가짜 slug가
 * 칸을 차지한다). 필터가 URL에 실려 글 수에 비례해 길어지므로(45편 ≈ 1.6KB), 한도에
 * 가까워지면 slug 목록을 본문으로 받는 RPC로 옮긴다.
 */
export async function getTopPosts(
  limit: number,
  slugs: readonly string[],
): Promise<TopPostRow[]> {
  if (limit <= 0 || slugs.length === 0) return [];
  const { data, error } = await publicDb
    .from('post_views')
    .select('slug, view_count')
    .in('slug', slugs)
    .order('view_count', { ascending: false })
    .order('slug', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return toTopPostRows(data);
}

/**
 * 글별 조회수(인기순 정렬용) — 1000행에서 잘려도 매번 같은 행이 오게 조회수순으로 정렬한다.
 */
export async function getAllViewCounts(
  slugs: readonly string[],
): Promise<TopPostRow[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await publicDb
    .from('post_views')
    .select('slug, view_count')
    .in('slug', slugs)
    .order('view_count', { ascending: false })
    .order('slug', { ascending: true });
  if (error) throw error;
  return toTopPostRows(data);
}

export async function incrementViewCount(slug: string): Promise<void> {
  const { error } = await publicDb.rpc('increment_view_count', {
    slug_input: slug,
  });
  if (error) throw error;
}
