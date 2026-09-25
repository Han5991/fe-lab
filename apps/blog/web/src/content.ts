/**
 * 이 앱의 콘텐츠 인스턴스 — fs를 읽는 로더·SEO 빌더의 **유일한** 조립 지점.
 *
 * 루트의 `content.config.mts`(경로 앵커)를 `createContent`/`createPostSeo`에
 * 넘겨 만든 인스턴스를 re-export한다. 모듈 스코프 인스턴스라 프로세스 전역
 * 캐시 의미론은 예전 싱글턴과 같다(dev에서는 인스턴스가 캐시를 우회한다).
 *
 * **서버 전용이다** — node:fs를 전이 의존하므로 클라이언트 컴포넌트에서
 * import하면 안 된다. 순수 유틸·타입·상수(postPath·isPostVisible·SITE_URL 등)는
 * 계속 `@blog/content`에서 직접 import한다.
 */
import { BUILD_NOW_ENV, createContent, resolveBuildNow } from '@blog/content';
import { createPostSeo } from '@blog/content/seo';
import contentConfig from '@/content.config.mts';

/**
 * 공개 판정의 기준 시각은 **빌드 전체가 하나**다. `pnpm build`가 시각 하나를
 * `BLOG_CONTENT_NOW`로 내보내고, prebuild(`blog-content`)와 여기(`next build`와
 * 그 워커들)가 같은 파서로 읽는다. 없으면 인스턴스를 만든 시각이라, 예약 글의
 * 공개 시각이 prebuild와 next build 사이에 지나면 페이지는 있는데 sitemap·og
 * 카드에는 없는 글이 생겼다. 형식이 틀린 값은 던진다(prebuild도 같은 값으로
 * 먼저 실패한다).
 */
export const content = createContent(contentConfig, {
  now: resolveBuildNow(process.env[BUILD_NOW_ENV]),
});

export const {
  getAllPosts,
  getAllPostSummaries,
  getAllPostsIncludingHidden,
  getPostBySlug,
  getAllPostSlugs,
  getAdjacentPosts,
  getSeriesAdjacentPosts,
  getSeriesMeta,
  getAllSeries,
  getAllTags,
  getAllYears,
} = content;

export const { buildPostSeo, buildPostJsonLd, buildBreadcrumbJsonLd } =
  createPostSeo(contentConfig);
