import { readAllPosts } from './repository';
import { isPostVisible } from './visibility';
import type { PostData, PostNavItem, AdjacentPostsOptions } from './types';

export type { PostData, PostNavItem, PostStatus } from './types';

// ---------- Public API ----------

/**
 * 공개된 포스트만 반환합니다 (published, 일정 지난 scheduled 포함).
 */
export function getAllPosts(): PostData[] {
  return readAllPosts().filter(isPostVisible);
}

/**
 * Admin 대시보드용: draft, scheduled 포함 모든 포스트를 반환합니다.
 */
export function getAllPostsIncludingHidden(): PostData[] {
  return readAllPosts();
}

let _postsBySlugMap: Map<string, PostData> | null = null;

/**
 * slug로 특정 포스트를 조회합니다.
 * 내부적으로 캐시된 Map을 사용하여 O(1)로 조회합니다.
 */
export function getPostBySlug(slug: string): PostData | null {
  if (!_postsBySlugMap) {
    _postsBySlugMap = new Map(getAllPosts().map(post => [post.slug, post]));
  }
  return _postsBySlugMap.get(slug) ?? null;
}

/**
 * 모든 공개 포스트의 slug 배열을 반환합니다.
 */
export function getAllPostSlugs(): string[] {
  return getAllPosts().map(post => post.slug);
}

/**
 * 현재 포스트 기준으로 이전/다음 포스트를 반환합니다.
 * - prev: 더 오래된(과거) 글
 * - next: 더 최신(미래) 글
 *
 * posts는 날짜 내림차순 정렬 (index 0 = 최신)
 * 따라서 index+1 = prev(과거), index-1 = next(미래)
 */
export function getAdjacentPosts(
  currentSlug: string,
  options?: AdjacentPostsOptions,
): { prev: PostNavItem | null; next: PostNavItem | null } {
  let posts = getAllPosts();

  if (options?.filterTag) {
    posts = posts.filter(p => p.tags?.includes(options.filterTag!));
  }

  if (options?.filterSeries) {
    posts = posts.filter(p => p.series === options.filterSeries);
  }

  if (options?.sortOrder === 'oldest') {
    posts = [...posts].reverse();
  }

  const currentIndex = posts.findIndex(p => p.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  const prevPost =
    currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? posts[currentIndex - 1] : null;

  return {
    prev: prevPost ? { slug: prevPost.slug, title: prevPost.title } : null,
    next: nextPost ? { slug: nextPost.slug, title: nextPost.title } : null,
  };
}

/**
 * 같은 시리즈 내의 이전/다음 포스트를 반환합니다.
 */
export function getSeriesAdjacentPosts(currentSlug: string): {
  prev: PostNavItem | null;
  next: PostNavItem | null;
  seriesName: string | null;
} {
  const currentPost = getPostBySlug(currentSlug);

  if (!currentPost?.series) {
    return { prev: null, next: null, seriesName: null };
  }

  const adjacent = getAdjacentPosts(currentSlug, {
    filterSeries: currentPost.series,
  });

  return {
    ...adjacent,
    seriesName: currentPost.series,
  };
}
