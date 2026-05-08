import { getAllPosts } from './service';
import { getSeriesMeta } from './series';
import type { PostSummary } from './types';

export interface SeriesSummary {
  id: string;
  title: string;
  count: number;
  description?: string;
  updated: string | null;
  /** 시리즈 컬러 키 — bundler/typescript-patterns/oss-diary 외에는 round-robin */
  colorKey: 'accent' | 'marker' | 'moss';
}

export interface TagSummary {
  id: string;
  count: number;
}

const SERIES_COLOR_MAP: Record<string, SeriesSummary['colorKey']> = {
  bundler: 'accent',
  'typescript-patterns': 'marker',
  '[Typescript로 설계하는 프로젝트]': 'marker',
  'oss-diary': 'moss',
  'open-source': 'moss',
};

const COLOR_FALLBACK: SeriesSummary['colorKey'][] = ['accent', 'marker', 'moss'];

/**
 * 모든 시리즈를 최근 글 기준 내림차순으로 반환합니다.
 */
export function getAllSeries(): SeriesSummary[] {
  const posts = getAllPosts();
  const map = new Map<string, { posts: PostSummary[]; updated: string | null }>();

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
    ([id, { posts: ps, updated }], idx) => {
      const meta = getSeriesMeta(id);
      const colorKey = SERIES_COLOR_MAP[id] ?? COLOR_FALLBACK[idx % 3];
      return {
        id,
        title: meta?.title ?? id,
        count: ps.length,
        description: meta?.description,
        updated,
        colorKey,
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

/**
 * 모든 태그를 사용 빈도 내림차순으로 반환합니다.
 */
export function getAllTags(): TagSummary[] {
  const posts = getAllPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

/**
 * 모든 연도(YYYY)를 내림차순으로 반환합니다.
 */
export function getAllYears(): { year: string; count: number }[] {
  const posts = getAllPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (!post.date) continue;
    const year = post.date.slice(0, 4);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year.localeCompare(a.year));
}
