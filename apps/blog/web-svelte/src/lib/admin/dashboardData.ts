import type {
  AdminPostIndex,
  PostStatDetail,
  PostStatsRow,
  PostTrendRow,
  TrendPoint,
} from '@blog/analytics';

/**
 * 세 출처를 글 단위로 합친다 — **순수 함수다.**
 *
 * `admin-posts-index.json`(빌드 산출물, 제목·발행 상태) · `get_all_post_stats`
 * RPC(누적·오늘 조회수) · `get_all_posts_trends` RPC(일별 추이)가 각각 다른 곳에서
 * 오고, 화면은 셋이 합쳐진 하나를 본다.
 *
 * React 판은 이 조립이 `useAdminViews.ts`의 `queryFn` 안에 있어서 열어 보려면
 * React Query를 세워야 한다. 여기서는 떼어 뒀다 — 조용히 깨지기 쉬운 자리이기
 * 때문이다: slug가 어긋나면 화면은 그려지고 숫자만 0이 된다.
 */
export function buildDashboardData(
  metadata: AdminPostIndex[],
  stats: PostStatsRow[],
  trends: PostTrendRow[],
): PostStatDetail[] {
  const trendsMap = new Map<string, TrendPoint[]>();
  for (const t of trends) {
    const arr = trendsMap.get(t.slug) ?? [];
    arr.push({ view_date: t.view_date, view_count: t.view_count });
    trendsMap.set(t.slug, arr);
  }
  const statsMap = new Map(stats.map(s => [s.slug, s]));

  return metadata.map(post => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    totalViews: statsMap.get(post.slug)?.total_views ?? 0,
    todayViews: statsMap.get(post.slug)?.today_views ?? 0,
    trends: trendsMap.get(post.slug) ?? [],
    // 폴백은 fail-closed('draft')여야 한다. 'published'로 두면 인덱스가 깨졌을 때
    // draft·scheduled 글이 대시보드에서 공개 글로 보인다.
    //
    // **타입이 보장하지 못하는 자리다.** 이 값은 빌드 산출물에서 왔고, 저장소의
    // 행 검사는 `typeof status === 'string'`까지만 본다(enum까지 보면 발행 상태가
    // 늘어날 때 그 검사가 조용한 필터가 된다 — `adminRepository.ts` 주석). 그래서
    // 타입은 `PostStatus`인데 실제로는 빈 문자열이 올 수 있다. 빈 문자열 검사를
    // 눈에 보이게 적어 둔다.
    status: (post.status as string) === '' ? 'draft' : post.status,
    scheduledDate: post.scheduledDate === '' ? null : post.scheduledDate,
  }));
}
