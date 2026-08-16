import { Suspense } from 'react';
import { css, cx } from '@design-system/ui-lib/css';
import type { Metadata } from 'next';

import {
  archiveUrl,
  getAllPostSummaries,
  POSTS_PATH,
  postUrl,
} from '@/domain/post';
import { getAllSeries, getAllTags, getAllYears } from '@/domain/post/aggregate';
import {
  SITE_URL,
  SITE_NAME,
  OG_DEFAULT_IMAGE,
  TITLE_SUFFIX,
} from '@/lib/shared/constants';
import { safeJsonLd } from '@/lib/shared/jsonLd';
// 폴백 목록과 하이드레이션 후 목록이 같은 행 컴포넌트를 쓰도록 배럴(index.ts)이
// 아니라 모듈에서 직접 가져온다.
import {
  ArchiveRow,
  PostsArchiveView,
} from '@/src/components/blog/PostsArchive';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';

// `<title>`·description을 세 곳(meta·og·twitter)에 각각 적으면 한 곳만 고쳐졌을 때
// 공유 카드와 검색 결과가 서로 다른 말을 한다. 페이지당 한 번만 쓴다 — /series가
// 쓰는 방식과 같다.
const PAGE_TITLE = `모든 노트${TITLE_SUFFIX}`;
const PAGE_DESCRIPTION =
  '프론트엔드 실험실에 쌓인 글 전부를 한 곳에서 봅니다. 태그·시리즈·연도로 좁혀 가며 번들러 만들기, TypeScript 설계, React 컴포넌트 패턴, 배포 파이프라인, 오픈소스 기여 기록 중 지금 필요한 글을 찾아보세요.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: POSTS_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: archiveUrl(),
    siteName: SITE_NAME,
    images: [
      {
        url: OG_DEFAULT_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Blog Posts`,
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_DEFAULT_IMAGE],
  },
};

export default function PostsPage() {
  const posts = getAllPostSummaries();
  const series = getAllSeries();
  const tags = getAllTags();
  const years = getAllYears();

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': archiveUrl(),
    name: 'Posts | Frontend Lab',
    url: archiveUrl(),
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
    inLanguage: 'ko',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        // 예전 리터럴 조합은 인코딩이 빠져 있었다 — 한글 slug 글이 생기면
        // ItemList만 sitemap·페이지 링크와 다른 URL을 말하게 되는 자리였다.
        item: postUrl(post.slug),
        name: post.title,
      })),
    },
  };

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${archiveUrl()}#blog`,
    name: 'Frontend Lab — 실험 기록들',
    url: archiveUrl(),
    description:
      '프론트엔드 실험실의 모든 기록들. React, TypeScript, 번들러 시리즈 등.',
    inLanguage: 'ko',
    author: { '@id': `${SITE_URL}/#author` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(blogJsonLd) }}
      />
      <PageBoundary transitionId="/posts" className={railGutter}>
        <div
          className={cx(
            railColumn({ width: 'wide' }),
            css({ py: { base: '10', md: '16' } }),
          )}
        >
          {/* 허브 문법에 맞춘 헤더 — 큰 세리프 타이틀 대신 21px 산세리프 +
              모노 수치 한 줄, 구분은 hairline 보더 하나로만. */}
          <header
            className={css({
              mb: '[30px]',
              pb: '[16px]',
              borderBottomWidth: '[1px]',
              borderBottomStyle: 'solid',
              borderColor: 'ink.border',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '[16px]',
              flexWrap: 'wrap',
            })}
          >
            <h1
              className={css({
                fontSize: '[21px]',
                fontWeight: 'bold',
                color: 'ink.950',
              })}
            >
              모든 노트
            </h1>
            <span
              className={css({
                fontFamily: 'mono',
                fontWeight: 'normal',
                fontSize: '[12px]',
                color: 'ink.500',
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              {posts.length}편
            </span>
          </header>

          {/*
            PostsArchiveView는 nuqs(useSearchParams)를 쓰므로 output: 'export'의
            빌드 타임 프리렌더 대상에서 빠진다 (BAILOUT_TO_CLIENT_SIDE_RENDERING).
            즉 out/posts/index.html에 구워지는 건 아래 fallback이 전부다.
            스피너를 두면 아카이브 허브의 내부 링크가 0개가 되므로, 글 목록을 여기서
            프리렌더해 링크를 남긴다. (브라우저에서 하이드레이션되면 인터랙티브 뷰로 교체)
            회귀 이력: c206b99에서 도입 → 15ed918(리디자인)에서 유실 → 재도입.
          */}
          <Suspense
            fallback={
              <ol className={css({ listStyleType: 'none', p: '0', m: '0' })}>
                {posts.map(post => (
                  <ArchiveRow key={post.slug} post={post} />
                ))}
              </ol>
            }
          >
            <PostsArchiveView
              posts={posts}
              series={series}
              tags={tags}
              years={years}
            />
          </Suspense>
        </div>
      </PageBoundary>
    </>
  );
}
