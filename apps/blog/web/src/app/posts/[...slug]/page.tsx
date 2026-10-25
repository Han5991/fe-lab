import { OG_DEFAULT_IMAGE, TIMEZONE } from '@/content.values.mts';
import {
  getAllPostSlugs,
  getPostBySlug,
  getAdjacentPosts,
  getSeriesAdjacentPosts,
} from '@/src/content';
import { isPostVisible, resolveThumbnailSrc } from '@blog/content/client';
import { notFound } from 'next/navigation';
import { css, cx } from '@blog/styled-system/css';
import { PreviewBanner } from '@/src/components/preview/PreviewBanner';
import { PostNavigation } from '@/src/components/post/PostNavigation';
import {
  buildPostSeo,
  buildPostJsonLd,
  buildBreadcrumbJsonLd,
} from '@/src/content';
import { toNextMetadata } from './nextMetadata';
import type { Metadata } from 'next';
import {
  Rail,
  railGutter,
  railColumn,
  railWithAside,
  railAsideMain,
} from '@/src/components/Rail';
import { safeJsonLd } from '@blog/content/client';
import { slugFromRouteParam } from '@/src/shared/routes';
import GiscusComments from '@/src/components/GiscusComments';
import { PageBoundary } from '@/src/components/PageBoundary';
import { BackToTop } from '@/src/components/mobile/BackToTop';
import { MobileTOC } from '@/src/components/mobile/MobileTOC';
import { ShareButton } from '@/src/components/mobile/ShareButton';
import { TOC } from '@/src/components/post/TOC';
import { ReadingProgress } from '@/src/components/post/ReadingProgress';
import { PostHeader } from '@/src/components/post/PostHeader';
import { PostHero } from '@/src/components/post/PostHero';
import { TagBadges } from '@/src/components/post/TagBadges';
import { QuoteLink } from '@/src/components/post/quote/QuoteLink';
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
  const slug = slugFromRouteParam(resolvedParams.slug);
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
  const slug = slugFromRouteParam(resolvedParams.slug);
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

  // PostHero가 쓰는 값 — 썸네일이 없는 글은 undefined로 둬서 hero 슬롯에서 빠진다.
  // 화면에 띄우는 주소라 글 카드 커버와 같은 resolveThumbnailSrc(최적화본 webp)다 — 카드에서
  // 넘어오면 이미 받은 이미지라 공유 요소 전환이 이미지를 기다리지 않는다. OG·JSON-LD는 PNG
  // 원본(resolveAbsoluteThumbnailUrl)을 그대로 쓴다.
  const thumbnailUrl = post.thumbnail
    ? resolveThumbnailSrc(post, OG_DEFAULT_IMAGE)
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

      {/* 문장을 선택하면 그 문장으로 열리는 링크를 복사하는 버튼.
          - 페이지 전환 경계(PageBoundary) 밖: 내비게이션의 페이지 스냅샷에 담기지 않아
            나가는 글과 함께 페이드·이동하지 않는다.
          - 페이지의 첫 포커스 가능 요소: 본문을 마우스로 고르면 초점이
            <main>(tabIndex -1, 건너뛰기 링크의 대상)으로 가서 Tab은 언제나 main
            맨 앞부터 다시 센다. 그래서 선택 지점 근처가 아니라 여기 둬야 첫
            Tab에 닿는다(본문 바로 뒤에 두면 본문 링크를 다 지난 뒤에야 닿았다). */}
      <QuoteLink />
      <ReadingProgress />
      <BackToTop />

      <div className={css({ display: 'block', lg: { display: 'none' } })}>
        <MobileTOC />
      </div>

      {/* 배경을 칠하지 않는다 — 지면색은 Layout이 이미 칠하고, 전환 중 페이지 스냅샷이
          불투명하면 그 아래(루트 스냅샷)의 고정 요소(FAB·진행 바)를 덮는다. */}
      <PageBoundary className={cx(railGutter, css({ pt: 'pageTop' }))}>
        {/* 셸은 wide 레일이라 홈·/about와 좌우 끝이 같고, 그 안에서 본문(railText 752)과 차례
            (tocAside 268)가 간격 32로 나란히 가운데에 선다(`railWithAside`). */}
        <div className={cx(railColumn({ width: 'wide' }), railWithAside)}>
          <article
            className={cx(
              railAsideMain,
              css({ display: 'flex', flexDir: 'column', gap: '10' }),
            )}
          >
            <PostHeader
              post={post}
              seriesName={seriesAdj.seriesName ?? undefined}
            />

            {/* hero는 frontmatter 값 그대로다 — thumbnailUrl과 달리 경로 해석이
                없어서 별도 계산을 거칠 이유가 없다. */}
            <PostHero
              slug={post.slug}
              title={post.title}
              hero={post.hero}
              thumbnailUrl={thumbnailUrl}
            />

            <PostBody content={post.content} relativeDir={post.relativeDir} />

            {/* 본문 아래 — 구분선 → 태그(아카이브 태그 필터의 유일한 입구)와 공유. */}
            <div
              className={css({
                display: 'flex',
                flexDir: 'column',
                gap: '6',
              })}
            >
              <hr className={css({ m: '0', borderColor: 'ink.border' })} />
              <div
                className={css({
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '3',
                })}
              >
                <TagBadges tags={post.tags ?? []} />
                <div className={css({ ml: 'auto' })}>
                  <ShareButton title={post.title} />
                </div>
              </div>
            </div>

            <GiscusComments />
          </article>

          <TOC />
        </div>
      </PageBoundary>

      {/* 본문 셸과 같은 wide 레일이라 왼쪽 끝이 본문과 맞는다.
          페이지 전환 경계는 따로 하나 더 둔다: 경계 밖이면
          페이지 스냅샷에 담기지 않고, React가 루트 스냅샷을 감추므로(경계 밖에
          바뀐 것이 없다고 보면 루트 그룹을 투명하게 둔다) 누른 이전·다음 카드가
          전환 첫 프레임에 사라졌다. 경계 안이면 글과 함께 밀려난다. */}
      <PageBoundary>
        <Rail width="wide" className={css({ pt: '10' })}>
          <PostNavigation prev={prev} next={next} seriesNav={seriesNav} />
        </Rail>
      </PageBoundary>
    </>
  );
}
