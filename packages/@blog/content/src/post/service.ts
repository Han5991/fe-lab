import { isPostVisible } from './visibility.ts';
import { sortPostsBySeriesOrder, type SeriesMeta } from './series.ts';
import type {
  PostData,
  PostNavItem,
  AdjacentPostsOptions,
  PostSummary,
} from './types.ts';

export type {
  PostData,
  PostNavItem,
  PostStatus,
  PostSummary,
} from './types.ts';

function toPostSummary(post: PostData): PostSummary {
  const { content: _content, ...summary } = post;
  return summary;
}

// ---------- Public API ----------

export interface PostService {
  getAllPosts: (now?: Date) => PostData[];
  getAllPostSummaries: () => PostSummary[];
  getAllPostsIncludingHidden: () => PostData[];
  getPostBySlug: (slug: string) => PostData | null;
  getAllPostSlugs: () => string[];
  getAdjacentPosts: (
    currentSlug: string,
    options?: AdjacentPostsOptions,
  ) => { prev: PostNavItem | null; next: PostNavItem | null };
  getSeriesAdjacentPosts: (currentSlug: string) => {
    prev: PostNavItem | null;
    next: PostNavItem | null;
    seriesName: string | null;
  };
}

export interface PostServiceDeps {
  readAllPosts: () => PostData[];
  getSeriesMeta: (seriesName: string) => SeriesMeta | null;
  /**
   * dev 서버에서만 draft·scheduled 글을 목록/상세에 함께 노출할지 여부의 판정.
   *
   * 글을 쓰는 중에 별도 라우트 없이 실제 화면에서 바로 확인하기 위한
   * 장치입니다. **이 게이트는 getAllPosts 한 곳에만 존재해야 합니다** — 공개
   * 여부를 결정하는 지점이 늘어나는 순간 예전의 "판정 규칙 두 벌" 문제가
   * 되살아납니다. `=== 'development'` 정확 비교여야 하는 이유(prebuild
   * 스크립트들은 NODE_ENV가 undefined라 느슨한 비교는 draft를 sitemap·RSS에
   * 실어 보낸다)는 설정 기본값 주석에 있습니다.
   */
  isDevelopment: () => boolean;
}

/**
 * 포스트 조회 서비스 factory. slug 조회 캐시는 인스턴스(클로저) 안에 산다.
 */
export function createPostService(deps: PostServiceDeps): PostService {
  const { readAllPosts, getSeriesMeta, isDevelopment } = deps;
  let postsBySlugMap: Map<string, PostData> | null = null;

  /**
   * 공개된 포스트만 반환합니다 (published, 일정 지난 scheduled 포함).
   *
   * 단, dev 서버에서는 draft·scheduled도 함께 반환합니다.
   * 목록·상세 화면은 실제로 비공개인 글에 배지/배너를 붙여 구분합니다.
   */
  function getAllPosts(now: Date = new Date()): PostData[] {
    const posts = readAllPosts();
    if (isDevelopment()) return posts;
    // 화살표로 감싸 Array.filter의 index가 isPostVisible의 now에 주입되는 것을 방지.
    // now는 주입 가능(기본 빌드 시각) — 테스트가 고정 시각으로 경계를 검증할 수 있음.
    return posts.filter(post => isPostVisible(post, now));
  }

  /** 홈/목록 등 요약 뷰에서 사용하는 경량 포스트 목록 */
  function getAllPostSummaries(): PostSummary[] {
    return getAllPosts().map(toPostSummary);
  }

  /** Admin 대시보드용: draft, scheduled 포함 모든 포스트 */
  function getAllPostsIncludingHidden(): PostData[] {
    return readAllPosts();
  }

  /**
   * slug로 특정 포스트를 조회합니다.
   * 내부적으로 캐시된 Map을 사용하여 O(1)로 조회합니다.
   * 단, 개발 모드에서는 수정한 마크다운이 바로 반영되도록 캐시를 건너뜁니다.
   */
  function getPostBySlug(slug: string): PostData | null {
    if (isDevelopment()) {
      return getAllPosts().find(post => post.slug === slug) ?? null;
    }

    if (!postsBySlugMap) {
      postsBySlugMap = new Map(getAllPosts().map(post => [post.slug, post]));
    }
    return postsBySlugMap.get(slug) ?? null;
  }

  /** 모든 공개 포스트의 slug 배열 */
  function getAllPostSlugs(): string[] {
    return getAllPosts().map(post => post.slug);
  }

  /**
   * 현재 포스트 기준으로 이전/다음 포스트를 반환합니다.
   * (공개 글 전체를 읽어 순수 함수 pickAdjacent에 위임)
   */
  function getAdjacentPosts(
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
  function getSeriesAdjacentPosts(currentSlug: string): {
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

  return {
    getAllPosts,
    getAllPostSummaries,
    getAllPostsIncludingHidden,
    getPostBySlug,
    getAllPostSlugs,
    getAdjacentPosts,
    getSeriesAdjacentPosts,
  };
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
    const { filterTag } = options;
    list = list.filter(p => p.tags?.includes(filterTag));
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
