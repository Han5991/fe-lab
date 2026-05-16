import type { PostSummary } from './types';

/**
 * /posts 아카이브의 정렬 키. URL `sort=` 파라미터 값과 동일.
 */
export type ArchiveSortKey = 'recent' | 'popular' | 'shortest';

export interface ArchiveFilterParams {
  q: string;
  tags: string[];
  series: string | null;
  year: string | null;
  sort: ArchiveSortKey;
  /** 인기순 정렬 시 Supabase post_views로 받은 slug→view_count 맵. 없으면 0 취급. */
  viewCounts?: Map<string, number>;
}

/**
 * URL 파라미터(q/tags/series/year/sort)를 받아 포스트 목록을 필터·정렬한 배열을 반환합니다.
 * `PostsArchiveView` 컴포넌트의 useMemo 본문과 동일한 로직 — 컴포넌트는 이 함수를 호출만 합니다.
 */
export function filterAndSortPostsByArchiveParams<
  T extends Pick<
    PostSummary,
    'slug' | 'title' | 'excerpt' | 'tags' | 'series' | 'date' | 'readMin'
  >,
>(posts: T[], params: ArchiveFilterParams): T[] {
  const { q, tags, series, year, sort, viewCounts } = params;
  let r: T[] = posts;

  const query = q.trim().toLowerCase();
  if (query) {
    r = r.filter(
      p =>
        p.title.toLowerCase().includes(query) ||
        (p.excerpt ?? '').toLowerCase().includes(query) ||
        (p.tags ?? []).some(t => t.toLowerCase().includes(query)),
    );
  }
  if (tags.length) {
    r = r.filter(p => tags.every(t => (p.tags ?? []).includes(t)));
  }
  if (series) {
    r = r.filter(p => p.series === series);
  }
  if (year) {
    r = r.filter(p => p.date?.startsWith(year));
  }

  const sorted: T[] = [...r];
  if (sort === 'shortest') {
    sorted.sort((a, b) => a.readMin - b.readMin);
  } else if (sort === 'popular') {
    sorted.sort((a, b) => {
      const va = viewCounts?.get(a.slug) ?? 0;
      const vb = viewCounts?.get(b.slug) ?? 0;
      if (vb !== va) return vb - va;
      return (b.date ?? '').localeCompare(a.date ?? '');
    });
  } else {
    sorted.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }
  return sorted;
}

/**
 * `?tag=a,b,c` 같은 콤마 구분 문자열을 배열로 파싱합니다.
 * 빈 토큰은 제거하고, 비어 있으면 빈 배열을 돌려줍니다.
 */
export function parseTagParam(tagParam: string | null | undefined): string[] {
  if (!tagParam) return [];
  return tagParam.split(',').filter(Boolean);
}

/**
 * title/excerpt에 query가 포함된 포스트만 반환합니다.
 * query가 비어있으면 입력을 그대로 반환합니다.
 */
export function filterPostsByQuery<
  T extends Pick<PostSummary, 'title' | 'excerpt'>,
>(posts: T[], query: string): T[] {
  const q = query.toLowerCase().trim();
  if (!q) return posts;
  return posts.filter(
    p =>
      p.title.toLowerCase().includes(q) ||
      (p.excerpt ?? '').toLowerCase().includes(q),
  );
}

/**
 * 그룹 entries에 query 필터를 적용합니다.
 * 그룹명이 매치되거나 그룹 내 글 제목이 매치되면 통과합니다.
 */
export function filterGroupedEntries<T extends { title: string }>(
  entries: [string, T[]][],
  query: string,
): [string, T[]][] {
  const q = query.toLowerCase().trim();
  if (!q) return entries;
  return entries.filter(
    ([name, items]) =>
      name.toLowerCase().includes(q) ||
      items.some(p => p.title.toLowerCase().includes(q)),
  );
}

/**
 * 시리즈별로 포스트를 그룹핑합니다.
 * 그룹은 첫 번째 글의 date 기준 내림차순으로 정렬됩니다.
 */
export function groupPostsBySeries<
  T extends Pick<PostSummary, 'series' | 'date'>,
>(posts: T[]): [string, T[]][] {
  const groups: Record<string, T[]> = {};
  for (const p of posts) {
    if (!p.series) continue;
    (groups[p.series] ??= []).push(p);
  }
  return Object.entries(groups).sort((a, b) => {
    const aDate = a[1][0]?.date ?? '';
    const bDate = b[1][0]?.date ?? '';
    return bDate.localeCompare(aDate);
  });
}

/**
 * 태그별로 포스트를 그룹핑합니다.
 * 그룹은 글 수 내림차순으로 정렬됩니다.
 */
export function groupPostsByTags<T extends Pick<PostSummary, 'tags'>>(
  posts: T[],
): [string, T[]][] {
  const groups: Record<string, T[]> = {};
  for (const p of posts) {
    if (!p.tags) continue;
    for (const tag of p.tags) {
      (groups[tag] ??= []).push(p);
    }
  }
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
}
