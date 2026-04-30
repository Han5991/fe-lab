import { readAllPosts } from './repository';
import { isPostVisible } from './visibility';
import { getSeriesMeta } from './series';
import type {
  PostData,
  PostNavItem,
  AdjacentPostsOptions,
  PostSummary,
} from './types';

export type { PostData, PostNavItem, PostStatus, PostSummary } from './types';

function toPostSummary(post: PostData): PostSummary {
  return {
    slug: post.slug,
    originalSlug: post.originalSlug,
    relativeDir: post.relativeDir,
    title: post.title,
    date: post.date,
    updatedAt: post.updatedAt,
    excerpt: post.excerpt,
    thumbnail: post.thumbnail,
    tags: post.tags,
    series: post.series,
    status: post.status,
    scheduledDate: post.scheduledDate,
  };
}

// ---------- Public API ----------

/**
 * 공개된 포스트만 반환합니다 (published, 일정 지난 scheduled 포함).
 */
export function getAllPosts(): PostData[] {
  return readAllPosts().filter(isPostVisible);
}

/**
 * 홈/목록 등 요약 뷰에서 사용하는 경량 포스트 목록을 반환합니다.
 */
export function getAllPostSummaries(): PostSummary[] {
  return getAllPosts().map(toPostSummary);
}

/**
 * Admin 대시보드용: draft, scheduled 포함 모든 포스트를 반환합니다.
 */
export function getAllPostsIncludingHidden(): PostData[] {
  return readAllPosts();
}

/**
 * 미리보기/관리용: draft, scheduled 포함 slug로 포스트를 조회합니다.
 */
export function getPostBySlugIncludingHidden(slug: string): PostData | null {
  return readAllPosts().find(post => post.slug === slug) ?? null;
}

let _postsBySlugMap: Map<string, PostData> | null = null;

/**
 * slug로 특정 포스트를 조회합니다.
 * 내부적으로 캐시된 Map을 사용하여 O(1)로 조회합니다.
 * 단, 개발 모드에서는 수정한 마크다운이 바로 반영되도록 캐시를 건너뜁니다.
 */
export function getPostBySlug(slug: string): PostData | null {
  if (process.env.NODE_ENV === 'development') {
    return getAllPosts().find(post => post.slug === slug) ?? null;
  }

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
 *
 * `_series.yml`의 `order` 필드가 있으면 그 순서대로 정렬하고,
 * 시리즈 표시명도 메타의 `title`로 대체합니다.
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

  const meta = getSeriesMeta(currentPost.series);
  const displayName = meta?.title ?? currentPost.series;

  if (meta?.order && meta.order.length > 0) {
    const seriesPosts = getAllPosts().filter(
      p => p.series === currentPost.series,
    );
    const orderMap = new Map(meta.order.map((slug, i) => [slug, i]));
    const ordered = [...seriesPosts].sort((a, b) => {
      const aRank =
        orderMap.get(a.slug) ??
        orderMap.get(a.originalSlug) ??
        Number.POSITIVE_INFINITY;
      const bRank =
        orderMap.get(b.slug) ??
        orderMap.get(b.originalSlug) ??
        Number.POSITIVE_INFINITY;
      if (aRank === bRank) {
        return (a.date ?? '').localeCompare(b.date ?? '');
      }
      return aRank - bRank;
    });
    const idx = ordered.findIndex(p => p.slug === currentSlug);
    if (idx === -1) {
      return { prev: null, next: null, seriesName: displayName };
    }
    const prevPost = idx > 0 ? ordered[idx - 1] : null;
    const nextPost = idx < ordered.length - 1 ? ordered[idx + 1] : null;
    return {
      prev: prevPost ? { slug: prevPost.slug, title: prevPost.title } : null,
      next: nextPost ? { slug: nextPost.slug, title: nextPost.title } : null,
      seriesName: displayName,
    };
  }

  const adjacent = getAdjacentPosts(currentSlug, {
    filterSeries: currentPost.series,
  });

  return {
    ...adjacent,
    seriesName: displayName,
  };
}
