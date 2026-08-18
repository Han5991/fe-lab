import { CONTENT } from '../shared/contentConfig.ts';
import type { SeriesColorKey } from '../shared/contentConfig.ts';
import { getAllPosts } from './service.ts';
import { getSeriesMeta } from './series.ts';
import type { PostSummary } from './types.ts';

export interface SeriesSummary {
  id: string;
  title: string;
  count: number;
  description?: string | undefined;
  updated: string | null;
  /** 시리즈 컬러 키 — 등록된 시리즈(registries.seriesColors) 외에는 round-robin */
  colorKey: SeriesColorKey;
}

export interface TagSummary {
  id: string;
  count: number;
}

// 폴더명 → 컬러 키 매핑은 설정(defineContent의 registries)에서 온다 — 예전에는
// domain이 UI 컬러 토큰 목록을 직접 소유했다. 키 규칙(폴더명과 정확히 일치)은
// 설정 쪽 주석 참고.
const SERIES_COLOR_MAP = CONTENT.registries.seriesColors;
const COLOR_FALLBACK = CONTENT.registries.seriesColorFallback;

/**
 * 모든 시리즈를 최근 글 기준 내림차순으로 반환합니다.
 *
 * `post.series`는 `_series.yml`로 선언된 폴더에만 붙습니다(`repository.ts`).
 * 그래서 여기서 시리즈 여부를 다시 거를 필요가 없습니다 — 걸러내는 조건을
 * 두면 항상 참이라 "여기서도 판정한다"는 오해만 남습니다.
 */
export function getAllSeries(): SeriesSummary[] {
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
    ([id, { posts: ps, updated }], idx) => {
      const meta = getSeriesMeta(id);
      // 폴백 목록이 비면 나머지 연산이 NaN이라 아무 색도 고르지 못한다.
      // 설정에서 비울 수 있는 값이므로 마지막 기본값을 명시한다.
      const cycled =
        COLOR_FALLBACK.length > 0
          ? COLOR_FALLBACK[idx % COLOR_FALLBACK.length]
          : undefined;
      const colorKey = SERIES_COLOR_MAP[id] ?? cycled ?? 'accent';
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
