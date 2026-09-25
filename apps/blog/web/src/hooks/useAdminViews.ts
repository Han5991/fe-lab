import { useSuspenseQuery } from '@tanstack/react-query';
import {
  getAdminPostsIndex,
  getAllPostStats,
  getAllPostsTrends,
} from '@/src/domain/analytics/admin';
import type { PostStatDetail, TrendPoint } from '@/src/domain/analytics';

export type { PostStatDetail };

/**
 * admin 쿼리의 재시도 정책 — 한 번만 다시 시도한다.
 *
 * 전역 기본값(3회, 1s·2s·4s 백오프)이면 Edge Function이 실패했을 때 스켈레톤이
 * ~7초 돌고 나서야 `src/app/admin/error.tsx`가 안내를 띄운다. admin 읽기는 같은
 * 리전의 한 왕복이라 일시 장애는 한 번이면 가려지고, 설정 오류(ADMIN_EMAIL 미설정
 * 등)는 몇 번을 다시 해도 같다.
 */
export function retryAdminQuery(failureCount: number): boolean {
  return failureCount < 1;
}

export function useAdminDashboardData() {
  return useSuspenseQuery({
    queryKey: ['admin', 'dashboard-data'],
    retry: retryAdminQuery,
    // SSG prerender 단계에서 getAdminPostsIndex가 typeof window 가드로 빈 배열을
    // 반환하기 때문에 SSR HTML은 placeholder 상태입니다. 글로벌 default
    // (staleTime 5분 + refetchOnMount false) 그대로면 그 빈 캐시가 클라이언트에
    // 그대로 hydrate된 후 5분간 refetch되지 않아 차트가 영원히 비어 보입니다.
    // 0 + 'always'로 hydration 직후 1회 refetch를 강제합니다.
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async (): Promise<PostStatDetail[]> => {
      // 인덱스를 먼저 받는다 — 조회수 두 읽기는 이 slug들로 서버에서 거른다
      // (anon이 만든 가짜 slug 행이 1000행 cap을 채워 실제 글을 밀어내지 않게).
      const metadata = await getAdminPostsIndex();
      const slugs = metadata.map(post => post.slug);
      const [stats, trends] = await Promise.all([
        getAllPostStats(slugs),
        getAllPostsTrends(slugs),
      ]);

      const trendsMap = new Map<string, TrendPoint[]>();
      for (const t of trends) {
        const arr = trendsMap.get(t.slug) ?? [];
        arr.push({ view_date: t.view_date, view_count: t.view_count });
        trendsMap.set(t.slug, arr);
      }

      const statsMap = new Map(stats.map(s => [s.slug, s]));

      return metadata.map(post => {
        const postStats = statsMap.get(post.slug);
        return {
          slug: post.slug,
          title: post.title,
          date: post.date,
          totalViews: postStats?.total_views ?? 0,
          todayViews: postStats?.today_views ?? 0,
          trends: trendsMap.get(post.slug) ?? [],
          // 폴백은 fail-closed('draft')여야 한다. 'published'로 두면 인덱스가
          // 깨졌을 때 draft·scheduled 글이 admin 대시보드에서 공개 글로 보인다.
          status: post.status || 'draft',
          scheduledDate: post.scheduledDate || null,
        };
      });
    },
  });
}
