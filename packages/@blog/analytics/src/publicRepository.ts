import type { PostgrestClient } from '@supabase/postgrest-js';
import type { Database } from './database.types.ts';
import type { TopPostRow } from './types.ts';

/**
 * Analytics 도메인 중 **공개 페이지**가 쓰는 데이터 접근 layer.
 *
 * 화면은 Supabase client를 직접 호출하지 않고 이 묶음의 함수만 쓴다.
 *
 * 여기 3건은 모두 익명(anon) 권한의 순수 PostgREST 호출이라 PostgREST 클라이언트
 * 하나로 충분하다. 인증 세션이 필요한 admin RPC는 `adminRepository.ts`에 따로
 * 있다 — 같은 파일에 두면 조회수만 읽는 페이지까지 supabase-js 전체를 받는다.
 *
 * **클라이언트를 주입받는다.** 예전에는 이 파일이 앱의 `publicClient` 싱글톤을
 * 직접 import했는데, 그 싱글톤은 `process.env.NEXT_PUBLIC_*`을 읽는 모듈이라
 * 이 코드가 Next.js에 묶여 있었다. 실제로 묶여 있던 건 **URL과 키를 어디서
 * 읽는가** 하나뿐이었고, 그건 앱이 아는 것이다. 그래서 앱이 만든 클라이언트를
 * 받고, 이 패키지는 어느 프레임워크에서 도는지 모른다.
 */
export interface PublicAnalytics {
  /** 조회수 상위 `limit`편. */
  getTopPosts(limit: number): Promise<TopPostRow[]>;
  /**
   * 모든 글의 조회수(정렬·limit 없음). 아카이브의 '인기순' 정렬처럼 전체
   * slug→view_count 맵이 필요할 때 쓴다.
   *
   * `post_views`는 글당 1행이라 PostgREST의 1000행 cap에 닿으려면 글이 1000편을
   * 넘어야 한다(`getAllPostsTrends`와 달리 post×day가 아니다). 그 전까지는
   * 페이지네이션이 필요 없다.
   */
  getAllViewCounts(): Promise<TopPostRow[]>;
  /** 조회수 +1. 쿨다운 판정은 호출자(쿠키)의 몫이다. */
  incrementViewCount(slug: string): Promise<void>;
}

export function createPublicAnalytics(
  db: PostgrestClient<Database>,
): PublicAnalytics {
  // `view_count`는 DB에서 nullable(`bigint default 0`)이라 여기서 0으로 정규화한다.
  const rows = (data: { slug: string; view_count: number | null }[] | null) =>
    (data ?? []).map(d => ({ slug: d.slug, view_count: d.view_count ?? 0 }));

  return {
    async getTopPosts(limit) {
      const { data } = await db
        .from('post_views')
        .select('slug, view_count')
        .order('view_count', { ascending: false })
        .limit(limit);
      return rows(data);
    },

    async getAllViewCounts() {
      const { data } = await db.from('post_views').select('slug, view_count');
      return rows(data);
    },

    async incrementViewCount(slug) {
      const { error } = await db.rpc('increment_view_count', {
        slug_input: slug,
      });
      if (error) throw error;
    },
  };
}
