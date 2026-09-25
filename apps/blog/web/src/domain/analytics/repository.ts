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
 *
 * **post_views의 slug는 믿을 수 없는 입력입니다.** 행을 만드는 쪽이 anon이
 * 부를 수 있는 `increment_view_count` RPC라, 공개 키만 있으면 아무 slug나 원하는
 * 만큼 올릴 수 있습니다(DB 함수는 형식 밖 slug만 거릅니다). 그래서 순위를 매기는
 * 읽기는 **실제 글 slug로 서버에서 거른 뒤** 자릅니다.
 *
 * 에러 정책: 읽기 둘 다 실패를 **throw** 합니다. 예전에는 `error`를 버리고 빈
 * 배열을 돌려줘서, 호출자가 "조회수가 아직 없다"와 "조회에 실패했다"를 구분하지
 * 못했습니다(인기 글 레일이 실패를 최신 글로 덮어 "인기"라고 보여 준 원인).
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
 * 조회수 상위 `limit`개 — `slugs`(이 빌드의 실제 글) 안에서만 고릅니다.
 *
 * 필터가 서버(`slug=in.(…)`)에 있어야 하는 이유: 상위 N개를 먼저 받고
 * 클라이언트에서 모르는 slug를 버리면, 가짜 slug N개가 조회수를 부풀리는 것만으로
 * N칸을 전부 차지해 결과가 통째로 빈다. 동률은 slug 순으로 끊어 순위가 요청마다
 * 흔들리지 않게 합니다.
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
 * 글별 조회수 — PostsArchive의 '인기순' 정렬처럼 slug→view_count 맵이 필요할 때.
 *
 * `slugs`를 주면 그 글들만 서버에서 거릅니다(권장 — 위 getTopPosts와 같은 이유).
 * PostgREST는 한 응답을 `max_rows`(1000행)에서 자르므로, 필터 없이 부르면 가짜
 * slug가 1000행을 넘기는 순간 실제 글이 잘려 나갈 수 있습니다. 그래서 조회수
 * 내림차순(동률은 slug)으로 정렬해 둡니다 — 잘리더라도 조회수가 가장 적은 행부터
 * 빠지고, 매 요청 같은 행이 옵니다.
 */
export async function getAllViewCounts(
  slugs?: readonly string[],
): Promise<TopPostRow[]> {
  if (slugs?.length === 0) return [];
  const base = publicDb.from('post_views').select('slug, view_count');
  const filtered = slugs ? base.in('slug', slugs) : base;
  const { data, error } = await filtered
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
