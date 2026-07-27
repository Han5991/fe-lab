import {
  getAllPostSlugs,
  getPostBySlug,
  getAdjacentPosts,
  getSeriesAdjacentPosts,
  getAllPosts,
} from '@/domain/post';
import { getSeriesMeta, sortPostsBySeriesOrder } from '@/domain/post/series';
import { resolveThumbnailUrl } from '@/domain/post/thumbnail';
import { isPostVisible } from '@/domain/post/visibility';
import { notFound } from 'next/navigation';
import PostClient from './PostClient';
import { PreviewBanner } from '@/src/components/preview/PreviewBanner';
import { PostNavigation } from '@/src/components/post/PostNavigation';
import {
  buildPostMetadata,
  buildPostJsonLd,
  buildBreadcrumbJsonLd,
} from './postSeo';
import type { Metadata } from 'next';
import { css } from '@design-system/ui-lib/css';
import { safeJsonLd } from '@/lib/jsonLd';

interface Props {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map(slug => ({
    slug: slug.split('/'),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug.join('/'));
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return buildPostMetadata(post, slug);
}

export default async function PostPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug.join('/'));
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { prev, next } = getAdjacentPosts(slug);
  const seriesAdj = getSeriesAdjacentPosts(slug);
  const seriesNav = seriesAdj.seriesName
    ? {
        prev: seriesAdj.prev,
        next: seriesAdj.next,
        seriesName: seriesAdj.seriesName,
      }
    : null;

  // 시리즈 내 위치 계산 (헤더 라벨용)
  let seriesIndex:
    | { current: number; total: number; displayName: string }
    | undefined;
  if (post.series) {
    const meta = getSeriesMeta(post.series);
    const seriesPosts = getAllPosts().filter(p => p.series === post.series);
    const orderedPosts = sortPostsBySeriesOrder(seriesPosts, meta?.order);
    const idx = orderedPosts.findIndex(p => p.slug === slug);
    if (idx !== -1) {
      seriesIndex = {
        current: idx + 1,
        total: orderedPosts.length,
        displayName: meta?.title ?? post.series,
      };
    }
  }

  const thumbnailUrl = resolveThumbnailUrl(post);
  const jsonLd = buildPostJsonLd(post, slug);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(post, slug);

  // dev 서버는 draft·scheduled 글도 이 경로로 열어준다(service.ts). 프로덕션과
  // 똑같이 렌더되면 발행 여부를 착각하므로 실제로 비공개일 때만 배너를 얹는다.
  const showHiddenBanner =
    process.env.NODE_ENV === 'development' && !isPostVisible(post);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      {showHiddenBanner && <PreviewBanner post={post} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <PostClient
        post={post}
        thumbnailUrl={post.thumbnail ? thumbnailUrl : undefined}
        seriesIndex={seriesIndex}
      />
      <div className={css({ maxW: 'containerW', mx: 'auto', px: '6' })}>
        <PostNavigation prev={prev} next={next} seriesNav={seriesNav} />
      </div>
    </>
  );
}
