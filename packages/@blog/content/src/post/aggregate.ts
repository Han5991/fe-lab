import type { SeriesMeta } from './series.ts';
import type { PostData, PostSummary } from './types.ts';

export interface SeriesSummary {
  id: string;
  title: string;
  count: number;
  description?: string | undefined;
  updated: string | null;
}

export interface Aggregate {
  getAllSeries: () => SeriesSummary[];
}

export interface AggregateDeps {
  getAllPosts: () => PostData[];
  getSeriesMeta: (seriesName: string) => SeriesMeta | null;
}

/** 시리즈 집계 factory. */
export function createAggregate(deps: AggregateDeps): Aggregate {
  const { getAllPosts, getSeriesMeta } = deps;

  /**
   * 모든 시리즈를 최근 글 기준 내림차순으로 반환합니다.
   *
   * `post.series`는 `_series.yml`로 선언된 폴더에만 붙습니다(`repository.ts`).
   * 그래서 여기서 시리즈 여부를 다시 거를 필요가 없습니다 — 걸러내는 조건을
   * 두면 항상 참이라 "여기서도 판정한다"는 오해만 남습니다.
   */
  function getAllSeries(): SeriesSummary[] {
    const posts = getAllPosts();
    const map = new Map<
      string,
      { posts: PostSummary[]; updated: string | null }
    >();

    for (const post of posts) {
      if (!post.series) continue;
      const entry = map.get(post.series) ?? { posts: [], updated: null };
      entry.posts.push(post);
      if (post.date) {
        if (!entry.updated || post.date.localeCompare(entry.updated) > 0) {
          entry.updated = post.date;
        }
      }
      map.set(post.series, entry);
    }

    const series: SeriesSummary[] = Array.from(map.entries()).map(
      ([id, { posts: ps, updated }]) => {
        const meta = getSeriesMeta(id);
        return {
          id,
          title: meta?.title ?? id,
          count: ps.length,
          description: meta?.description,
          updated,
        };
      },
    );

    return series.sort((a, b) => {
      if (a.updated && b.updated) return b.updated.localeCompare(a.updated);
      if (a.updated) return -1;
      if (b.updated) return 1;
      return a.id.localeCompare(b.id);
    });
  }

  return { getAllSeries };
}
