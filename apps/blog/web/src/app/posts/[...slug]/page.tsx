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
import { Rail } from '@/src/components/Rail';
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
    { current: number; total: number; displayName: string } | undefined;
  // `series`는 `_series.yml`로 선언된 폴더에만 붙는다(`repository.ts`). 주제별로
  // 모아 둔 폴더의 글은 series가 비어 있어 배지가 생기지 않는다.
  const seriesPosts = post.series
    ? getAllPosts().filter(p => p.series === post.series)
    : [];
  if (post.series && seriesPosts.length > 0) {
    const meta = getSeriesMeta(post.series);
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
      {/* PostClient의 셸과 같은 wide 레일이라 왼쪽 끝이 본문과 맞는다.
          위 여백을 따로 주지 않는 것은 PostClient의 PageBoundary 하단 패딩이
          이미 그 간격을 만들기 때문 — 둘 다 주면 댓글과 네비 사이가 200px
          가까이 벌어진다. */}
      <Rail width="wide">
        <PostNavigation prev={prev} next={next} seriesNav={seriesNav} />
      </Rail>
    </>
  );
}
