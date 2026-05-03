import type { PostSummary } from './types';

/**
 * title/excerpt에 query가 포함된 포스트만 반환합니다.
 * query가 비어있으면 입력을 그대로 반환합니다.
 */
export function filterPostsByQuery<T extends Pick<PostSummary, 'title' | 'excerpt'>>(
  posts: T[],
  query: string,
): T[] {
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
export function groupPostsBySeries<T extends Pick<PostSummary, 'series' | 'date'>>(
  posts: T[],
): [string, T[]][] {
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
