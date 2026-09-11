import { fmtDate, postPath, sortPostsBySeriesOrder } from '@blog/content';
import {
  getAllPostSummaries,
  getAllSeries,
  getSeriesMeta,
} from '$lib/server/content';
import { archivePath } from '@blog/content';

/**
 * 시리즈 목록 — 시리즈마다 **소속 글까지** 붙인다.
 *
 * 정렬은 `_series.yml`의 `order` 우선, 없으면 날짜 오름차순이다
 * (`sortPostsBySeriesOrder`). 글 상세의 시리즈 네비게이션과 같은 규칙이라
 * 여기서 따로 정렬하지 않는다 — 두 곳이 갈리면 "다음 편"이 목록의 다음 글과
 * 달라진다.
 */
export const load = () => {
  const posts = getAllPostSummaries();

  const bySeries = new Map<string, typeof posts>();
  for (const post of posts) {
    if (!post.series) continue;
    const bucket = bySeries.get(post.series);
    if (bucket) bucket.push(post);
    else bySeries.set(post.series, [post]);
  }

  const series = getAllSeries().map(entry => {
    const ordered = sortPostsBySeriesOrder(
      bySeries.get(entry.id) ?? [],
      getSeriesMeta(entry.id)?.order,
    );
    return {
      id: entry.id,
      title: entry.title,
      description: entry.description ?? '',
      href: archivePath({ series: entry.id }),
      posts: ordered.map(p => ({
        slug: p.slug,
        href: postPath(p.slug),
        title: p.title,
        date: fmtDate(p.date),
      })),
    };
  });

  return {
    series,
    totalPosts: series.reduce((sum, s) => sum + s.posts.length, 0),
  };
};
