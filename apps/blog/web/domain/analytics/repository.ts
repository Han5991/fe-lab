/**
 * Analytics 도메인 중 **공개 페이지**가 쓰는 데이터 접근 layer.
 *
 * 컴포넌트와 React 훅은 Supabase client를 직접 호출하지 않고
 * 이 모듈의 함수만 사용합니다.
 *
 * 여기 있는 3건은 모두 익명(anon) 권한의 순수 PostgREST 호출이라
 * `lib/platform/publicClient.ts`(PostgREST만)로 충분합니다. 인증 세션이 필요한
 * admin RPC는 `adminRepository.ts`에 따로 있습니다 — 같은 파일에 두면
 * 조회수만 읽는 페이지까지 supabase-js 전체를 받게 됩니다.
 */

import { publicDb } from '@/lib/platform/publicClient';

export interface TopPostRow {
  slug: string;
  view_count: number;
}

export async function getTopPosts(limit: number): Promise<TopPostRow[]> {
  const { data } = await publicDb
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
  const { data } = await publicDb.from('post_views').select('slug, view_count');
  return (data ?? []).map(d => ({
    slug: d.slug,
    view_count: d.view_count ?? 0,
  }));
}

export async function incrementViewCount(slug: string): Promise<void> {
  const { error } = await publicDb.rpc('increment_view_count', {
    slug_input: slug,
  });
  if (error) throw error;
}
