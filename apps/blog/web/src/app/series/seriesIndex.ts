import { sortPostsBySeriesOrder } from '@blog/content';
import type { PostSummary } from '@blog/content';
import type { SeriesSummary } from '@blog/content';

export interface SeriesWithPosts extends SeriesSummary {
  posts: PostSummary[];
}

/**
 * 시리즈 목록에 소속 글을 붙입니다.
 *
 * `_series.yml`의 `order`를 읽는 일은 fs 접근(= 서버 전용)이라 호출부가
 * `orderOf`로 주입합니다. 덕분에 이 함수 자체는 순수해서 테스트로 고정할 수
 * 있고, 정렬 규칙은 도메인의 `sortPostsBySeriesOrder` 한 곳만 씁니다
 * (order 우선 → 없으면 date 오름차순).
 */
export function attachSeriesPosts(
  series: SeriesSummary[],
  posts: PostSummary[],
  orderOf: (seriesId: string) => string[] | undefined,
): SeriesWithPosts[] {
  const bySeries = new Map<string, PostSummary[]>();
  for (const post of posts) {
    if (!post.series) continue;
    const bucket = bySeries.get(post.series);
    if (bucket) bucket.push(post);
    else bySeries.set(post.series, [post]);
  }

  return series.map(entry => ({
    ...entry,
    posts: sortPostsBySeriesOrder(
      bySeries.get(entry.id) ?? [],
      orderOf(entry.id),
    ),
  }));
}
