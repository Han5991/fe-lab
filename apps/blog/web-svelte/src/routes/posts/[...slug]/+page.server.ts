import { error } from '@sveltejs/kit';
import {
  archivePath,
  fmtDate,
  postPath,
  resolveThumbnailUrl,
  sortPostsBySeriesOrder,
} from '@blog/content';
import { OG_DEFAULT_IMAGE } from '@blog/site-values';
import {
  buildPostSeo,
  getAdjacentPosts,
  getAllPostSlugs,
  getAllPosts,
  getPostBySlug,
  getSeriesAdjacentPosts,
  getSeriesMeta,
} from '$lib/server/content';
import { renderPost } from '$lib/server/markdown';

/**
 * 프리렌더 대상 열거 — 정적 export라 SvelteKit이 어떤 slug가 있는지 알아야 한다.
 * React 판의 `generateStaticParams`에 대응한다.
 */
export const entries = () => getAllPostSlugs().map(slug => ({ slug }));

/**
 * rest 파라미터는 **후행 슬래시를 삼킨다.**
 *
 * `trailingSlash: 'always'`라 URL이 `/posts/foo/`인데, `[...slug]`가 그 마지막
 * 빈 세그먼트까지 잡아 `params.slug`가 `'foo/'`가 된다. Next.js의 catch-all은
 * 세그먼트 배열(`['foo']`)이라 이 문제가 없다 — 같은 URL 계약을 걸어도 라우터가
 * 넘겨주는 값의 모양이 다르다는 뜻이라, 옮길 때 조용히 전 글이 404가 됐다
 * (프리렌더가 fail로 잡아 줬다).
 */
const normalizeSlug = (raw: string): string => raw.replace(/\/+$/, '');

/** 메타 줄에 인라인시킬 태그 — 최대 4개, 각자 아카이브 필터로 간다. */
const MAX_TAGS = 4;

export const load = ({ params }: { params: { slug: string } }) => {
  const slug = normalizeSlug(params.slug);
  const post = getPostBySlug(slug);
  if (!post) error(404, `글을 찾을 수 없습니다: ${slug}`);

  // 시리즈 안 위치. `_series.yml`의 order를 따르고, 없으면 날짜 오름차순이다.
  let seriesIndex:
    { current: number; total: number; displayName: string } | undefined;
  const seriesPosts = post.series
    ? getAllPosts().filter(p => p.series === post.series)
    : [];
  if (post.series && seriesPosts.length > 0) {
    const meta = getSeriesMeta(post.series);
    const ordered = sortPostsBySeriesOrder(seriesPosts, meta?.order);
    const idx = ordered.findIndex(p => p.slug === slug);
    if (idx !== -1) {
      seriesIndex = {
        current: idx + 1,
        total: ordered.length,
        displayName: meta?.title ?? post.series,
      };
    }
  }

  // 썸네일이 없는 글은 undefined로 둬서 히어로 슬롯에서 빠진다 — 그 자리는
  // `hero:` 다이어그램이 있으면 그것이, 없으면 아무것도 채우지 않는다.
  const thumbnailUrl = post.thumbnail
    ? resolveThumbnailUrl(post, OG_DEFAULT_IMAGE)
    : undefined;

  // 본문 HTML과 차례를 한 번의 파싱으로 함께 받는다.
  const { html, toc } = renderPost(post.content, post.relativeDir);

  const { prev, next } = getAdjacentPosts(slug);
  const series = getSeriesAdjacentPosts(slug);
  const navItem = (item: { slug: string; title: string } | null) =>
    item ? { href: postPath(item.slug), title: item.title } : null;

  return {
    post: {
      slug: post.slug,
      title: post.title,
      date: post.date,
      dateLabel: fmtDate(post.date),
      readMin: post.readMin,
      excerpt: post.excerpt ?? '',
      // frontmatter 값 그대로다 — 경로 해석이 없어 계산을 거칠 이유가 없다.
      hero: post.hero,
      thumbnailUrl,
      tags: (post.tags ?? []).slice(0, MAX_TAGS).map(tag => ({
        tag,
        href: archivePath({ tag }),
      })),
      html,
    },
    toc,
    seriesIndex,
    nav: {
      prev: navItem(prev),
      next: navItem(next),
      /**
       * 시리즈 글이면 시리즈 네비만, 아니면 전체 이전/다음만 그린다. 둘을 같이
       * 그리면 순서 개념이 둘이 되어 같은 글이 `다음 편`이자 `이전 글`로 잡힌다
       * — 연달아 발행한 시리즈에서 실제로 그랬다.
       */
      series:
        series.seriesName && (series.prev || series.next)
          ? {
              seriesName: series.seriesName,
              prev: navItem(series.prev),
              next: navItem(series.next),
            }
          : null,
    },
    seo: buildPostSeo(post, post.slug),
  };
};
