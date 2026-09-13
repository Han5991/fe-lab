import {
  fmtDate,
  postPath,
  resolveThumbnailSrc,
  sortPostsBySeriesOrder,
  type PostSummary,
} from '@blog/content';
import { OG_DEFAULT_IMAGE } from '@blog/site-values';
import { getAllPostSummaries, getSeriesMeta } from '$lib/server/content';
import { seriesBadgeLabel } from '$lib/shared/seriesBadge';

/** 허브에 노출할 최근 글 수. 대표 글 1개는 제외한 나머지에서 센다. */
const RECENT_COUNT = 12;

/**
 * 대표 글의 시리즈 배지 문구. 시리즈 안 순서는 `_series.yml`의 `order`를 따르고
 * (없으면 날짜 오름차순) 글 상세의 시리즈 네비게이션과 같은 규칙을 쓴다.
 */
function buildSeriesLabel(
  post: PostSummary,
  allPosts: PostSummary[],
): string | undefined {
  // `series`는 `_series.yml`로 선언된 폴더에만 붙는다. 주제별로 모아 둔
  // 폴더의 글은 여기서 그대로 빠진다.
  if (!post.series) return undefined;
  const siblings = allPosts.filter(p => p.series === post.series);
  const meta = getSeriesMeta(post.series);
  const ordered = sortPostsBySeriesOrder(siblings, meta?.order);
  return seriesBadgeLabel(
    meta?.title ?? post.series,
    ordered.map(p => p.slug),
    post.slug,
  );
}

/**
 * 자동 생성 OG 카드는 1200×630 소셜 카드라 150px 칸에서 글자가 뭉갠다.
 * thumbnail이 비었거나 `/og/*`를 가리키면(= 빌드가 만들어 준 경우) 이미지 대신
 * 다이어그램 썸네일을 세우므로, 여기서는 **자기 썸네일이 있을 때만** 경로를 준다.
 */
function ownThumbnailSrc(post: PostSummary): string | undefined {
  const hasOwn = Boolean(post.thumbnail) && !post.thumbnail?.startsWith('/og/');
  return hasOwn ? resolveThumbnailSrc(post, OG_DEFAULT_IMAGE) : undefined;
}

/** 홈 — 대표 글 1개 + 최근 글 목록. 요약만 내려보낸다. */
export const load = () => {
  const allPosts = getAllPostSummaries();
  const [featured] = allPosts;

  return {
    featured: featured
      ? {
          href: postPath(featured.slug),
          title: featured.title,
          excerpt: featured.excerpt ?? '',
          date: fmtDate(featured.date),
          readMin: featured.readMin,
          seriesLabel: buildSeriesLabel(featured, allPosts),
          thumbnailSrc: ownThumbnailSrc(featured),
        }
      : null,
    recent: allPosts.slice(1, 1 + RECENT_COUNT).map(p => ({
      slug: p.slug,
      href: postPath(p.slug),
      title: p.title,
      date: p.date,
    })),
  };
};
