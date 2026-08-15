import { readAllPosts } from './repository';
import { isPostVisible } from './visibility';
import { getSeriesMeta, sortPostsBySeriesOrder } from './series';
import type {
  PostData,
  PostNavItem,
  AdjacentPostsOptions,
  PostSummary,
} from './types';

export type { PostData, PostNavItem, PostStatus, PostSummary } from './types';

function toPostSummary(post: PostData): PostSummary {
  const { content: _content, ...summary } = post;
  return summary;
}

// ---------- Public API ----------

/**
 * dev 서버에서만 draft·scheduled 글을 목록/상세에 함께 노출할지 여부.
 *
 * 글을 쓰는 중에 별도 라우트 없이 실제 화면에서 바로 확인하기 위한
 * 장치입니다. **이 게이트는 여기 한 곳에만 존재해야 합니다** — 공개 여부를
 * 결정하는 지점이 늘어나는 순간 이번 리팩토링이 없앤 "판정 규칙 두 벌" 문제가
 * 그대로 되살아납니다.
 *
 * `=== 'development'`로 정확히 비교하는 이유(`!== 'production'`이 아니라):
 * 정적 산출물을 만드는 스크립트들(prebuild/predev의 sitemap·rss·search-index·
 * llms-full·og-images)은 tsx로 직접 실행되어 NODE_ENV가 **undefined**입니다.
 * 느슨하게 비교하면 그 스크립트들이 dev로 오인되어 draft가 sitemap과 RSS에
 * 실려 나갑니다. next dev만 'development'를 설정합니다.
 */
function shouldIncludeHiddenPosts(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 공개된 포스트만 반환합니다 (published, 일정 지난 scheduled 포함).
 *
 * 단, dev 서버에서는 draft·scheduled도 함께 반환합니다.
 * 목록·상세 화면은 실제로 비공개인 글에 배지/배너를 붙여 구분합니다.
 */
export function getAllPosts(now: Date = new Date()): PostData[] {
  const posts = readAllPosts();
  if (shouldIncludeHiddenPosts()) return posts;
  // 화살표로 감싸 Array.filter의 index가 isPostVisible의 now에 주입되는 것을 방지.
  // now는 주입 가능(기본 빌드 시각) — 테스트가 고정 시각으로 경계를 검증할 수 있음.
  return posts.filter(post => isPostVisible(post, now));
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
 * posts 배열에서 currentSlug 기준 이전/다음 글을 고릅니다(순수 함수, fs 비의존).
 *
 * posts는 날짜 내림차순 정렬을 가정합니다(index 0 = 최신):
 * - prev(더 과거) = index+1
 * - next(더 최신) = index-1
 * options로 tag/series 필터, sortOrder='oldest'면 역순을 적용한 뒤 인접 글을 찾습니다.
 */
export function pickAdjacent(
  posts: PostData[],
  currentSlug: string,
  options?: AdjacentPostsOptions,
): { prev: PostNavItem | null; next: PostNavItem | null } {
  let list = posts;

  if (options?.filterTag) {
    list = list.filter(p => p.tags?.includes(options.filterTag!));
  }

  if (options?.filterSeries) {
    list = list.filter(p => p.series === options.filterSeries);
  }

  if (options?.sortOrder === 'oldest') {
    list = [...list].reverse();
  }

  const currentIndex = list.findIndex(p => p.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  const prevPost =
    currentIndex < list.length - 1 ? list[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? list[currentIndex - 1] : null;

  return {
    prev: prevPost ? { slug: prevPost.slug, title: prevPost.title } : null,
    next: nextPost ? { slug: nextPost.slug, title: nextPost.title } : null,
  };
}

/**
 * 현재 포스트 기준으로 이전/다음 포스트를 반환합니다.
 * (공개 글 전체를 읽어 순수 함수 pickAdjacent에 위임)
 */
export function getAdjacentPosts(
  currentSlug: string,
  options?: AdjacentPostsOptions,
): { prev: PostNavItem | null; next: PostNavItem | null } {
  return pickAdjacent(getAllPosts(), currentSlug, options);
}

/**
 * 같은 시리즈 내의 이전/다음 포스트를 반환합니다.
 *
 * `_series.yml`의 `order` 필드가 있으면 그 순서대로 정렬하고,
 * 시리즈 표시명도 메타의 `title`로 대체합니다.
 *
 * 시리즈가 아닌 폴더(= `_series.yml`이 없다)의 글은 애초에 `series`가 비어
 * 있으므로(`repository.ts`) 아래 첫 분기에서 전부 null로 나갑니다.
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
    const ordered = sortPostsBySeriesOrder(seriesPosts, meta.order);
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
