import { OG_DEFAULT_IMAGE, TIMEZONE } from '@/content.values.mts';
import {
  getAllPostSlugs,
  getPostBySlug,
  getAdjacentPosts,
  getSeriesAdjacentPosts,
  getAllPosts,
  getSeriesMeta,
} from '@/src/content';
import { sortPostsBySeriesOrder } from '@blog/content';
import { resolveThumbnailUrl } from '@blog/content';
import { isPostVisible } from '@blog/content';
import { notFound } from 'next/navigation';
import { css, cx } from '@design-system/ui-lib/css';
import { PreviewBanner } from '@/src/components/preview/PreviewBanner';
import { PostNavigation } from '@/src/components/post/PostNavigation';
import {
  buildPostSeo,
  buildPostJsonLd,
  buildBreadcrumbJsonLd,
} from '@/src/content';
import { toNextMetadata } from './nextMetadata';
import type { Metadata } from 'next';
import { Rail, railGutter, railColumn } from '@/src/components/Rail';
import { safeJsonLd } from '@blog/content';
import GiscusComments from '@/src/components/GiscusComments';
import { PageBoundary } from '@/src/components/PageBoundary';
import { BackToTop } from '@/src/components/mobile/BackToTop';
import { MobileTOC } from '@/src/components/mobile/MobileTOC';
import { ShareButton } from '@/src/components/mobile/ShareButton';
import { TOC } from '@/src/components/post/TOC';
import { ReadingProgress } from '@/src/components/post/ReadingProgress';
import { PostHeader } from '@/src/components/post/PostHeader';
import { PostHero } from '@/src/components/post/PostHero';
import { PostBody } from './PostBody';
import { PostRuntime } from './PostRuntime';

interface Props {
  params: Promise<{
    slug: string[];
  }>;
}

// await할 것이 없으므로 동기 함수로 둔다(require-await). Next는 반환값이
// promise든 아니든 동일하게 처리한다.
export function generateStaticParams() {
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

  // SEO 계산(postSeo)은 프레임워크 중립 DTO를 내고, Next Metadata로의
  // 변환은 앱 어댑터가 한다.
  return toNextMetadata(buildPostSeo(post, slug));
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

  // PostHero·전환 매칭이 쓰는 값 — 썸네일이 없는 글은 undefined로 둬서
  // hero 슬롯·모핑 대상에서 빠진다.
  const thumbnailUrl = post.thumbnail
    ? resolveThumbnailUrl(post, OG_DEFAULT_IMAGE)
    : undefined;
  const jsonLd = buildPostJsonLd(post, slug);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(post, slug);

  // dev 서버는 draft·scheduled 글도 이 경로로 열어준다(service.ts). 프로덕션과
  // 똑같이 렌더되면 발행 여부를 착각하므로 실제로 비공개일 때만 배너를 얹는다.
  const showHiddenBanner =
    process.env.NODE_ENV === 'development' && !isPostVisible(post, TIMEZONE);

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

      {/* 조회수·최근 본 글 부수효과 — 화면 없는 클라이언트 잎. */}
      <PostRuntime slug={post.slug} title={post.title} />

      <ReadingProgress />
      <BackToTop />

      <div className={css({ display: 'block', lg: { display: 'none' } })}>
        <MobileTOC />
      </div>

      <PageBoundary
        // 썸네일 있으면 /posts/*(hero 모핑 대상), 없으면 /posts-plain/*(fade 폴백)으로
        // 분기해 전환 매칭을 라우팅한다. (URL은 그대로 /posts/{slug})
        transitionId={
          thumbnailUrl ? `/posts/${post.slug}` : `/posts-plain/${post.slug}`
        }
        className={cx(
          railGutter,
          css({ py: { base: '10', md: '14' }, bg: 'paper.50' }),
        )}
      >
        {/* 셸은 wide 레일이라 헤더·/posts와 좌우 끝이 같고, 그 안에서 본문이
            text 레일(680)을 차지하고 TOC가 오른쪽 끝에 붙는다. */}
        <div
          className={cx(
            railColumn({ width: 'wide' }),
            css({
              display: 'grid',
              // 차례 칼럼 268px은 레퍼런스(fumadocs)와 같은 폭이다. 240px에서는
              // 한국어 헤딩이 대부분 두 줄로 접혀 목록이 두 배로 길어졌다.
              // wide 레일(1200) − 차례(268) − 간격(64) = 868px이라 본문
              // 칼럼(railText 680)에는 영향이 없다.
              gridTemplateColumns: { base: '1fr', lg: '[1fr 268px]' },
              gap: { base: '0', lg: '16' },
              alignItems: 'start',
            }),
          )}
        >
          <article
            className={css({
              maxW: 'railText',
              minW: '0',
              mx: { base: 'auto', lg: '0' },
              w: 'full',
            })}
          >
            <PostHeader post={post} seriesIndex={seriesIndex} />

            {/* hero는 frontmatter 값 그대로다 — thumbnailUrl과 달리 경로 해석이
                없어서 별도 계산을 거칠 이유가 없다. */}
            <PostHero
              slug={post.slug}
              title={post.title}
              hero={post.hero}
              thumbnailUrl={thumbnailUrl}
            />

            <PostBody content={post.content} relativeDir={post.relativeDir} />

            <div
              className={css({
                mt: '14',
                pt: '6',
                borderTopWidth: 'hairline',
                borderColor: 'ink.border',
                display: 'flex',
                justifyContent: 'flex-end',
              })}
            >
              <ShareButton title={post.title} />
            </div>

            <div className={css({ mt: '10' })}>
              <GiscusComments />
            </div>
          </article>

          <TOC />
        </div>
      </PageBoundary>

      {/* 본문 셸과 같은 wide 레일이라 왼쪽 끝이 본문과 맞는다.
          위 여백을 따로 주지 않는 것은 PageBoundary 하단 패딩이
          이미 그 간격을 만들기 때문 — 둘 다 주면 댓글과 네비 사이가 200px
          가까이 벌어진다. */}
      <Rail width="wide">
        <PostNavigation prev={prev} next={next} seriesNav={seriesNav} />
      </Rail>
    </>
  );
}
