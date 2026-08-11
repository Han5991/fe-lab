import {
  getAllPostSlugs,
  getPostBySlug,
  getAdjacentPosts,
  getSeriesAdjacentPosts,
  getAllPosts,
} from '@/domain/post';
import {
  getSeriesMeta,
  isSeriesFolder,
  sortPostsBySeriesOrder,
} from '@/domain/post/series';
import { resolveThumbnailUrl } from '@/domain/post/thumbnail';
import { isPostVisible } from '@/domain/post/visibility';
import { notFound } from 'next/navigation';
import PostClient from './PostClient';
import { PreviewBanner } from '@/src/components/preview/PreviewBanner';
import { DiscoveryBand } from '@/src/components/blog/DiscoveryBand';
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
  // 한 편짜리 폴더는 시리즈가 아니다 — 배지를 달면 `Turborepo 인프라 1/1`
  // 처럼 뜻이 없는 표기가 된다(`isSeriesFolder` 참고).
  const seriesPosts = post.series
    ? getAllPosts().filter(p => p.series === post.series)
    : [];
  if (post.series && isSeriesFolder(post.series, seriesPosts.length)) {
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
      {/* 본문 컨테이너(PostClient의 articleW + px 8)와 같은 폭·좌우 여백을 써
          왼쪽 끝이 본문과 맞는다. 예전엔 containerW(1200px)라 본문(1080px)보다
          넓게 삐져나왔다. 위 여백을 따로 주지 않는 것은 PostClient의 PageBoundary
          하단 패딩이 이미 그 간격을 만들기 때문 — 둘 다 주면 댓글과 네비 사이가
          200px 가까이 벌어진다. */}
      <div className={css({ maxW: 'articleW', mx: 'auto', px: '8' })}>
        {/* 홈의 발견 면과 같은 밴드 머리. 이동 카드가 아무 예고 없이 나오던
            자리에 라벨을 세워, 글이 끝나고 다음 갈 곳이 시작된다는 걸 알린다. */}
        <DiscoveryBand id="post-nav" title="이어지는 글" />
        <PostNavigation prev={prev} next={next} seriesNav={seriesNav} />
      </div>
    </>
  );
}
