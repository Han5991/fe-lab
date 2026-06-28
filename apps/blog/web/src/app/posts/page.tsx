import { Suspense } from 'react';
import { css } from '@design-system/ui-lib/css';
import type { Metadata } from 'next';

import { getAllPostSummaries } from '@/domain/post';
import { getAllSeries, getAllTags, getAllYears } from '@/domain/post/aggregate';
import { SITE_URL } from '@/lib/constants';
import { Label, PostsArchiveView } from '@/src/components/blog';
import { PageBoundary } from '@/src/components/PageBoundary';

export const metadata: Metadata = {
  title: '모든 노트 | Frontend Lab',
  description: '프론트엔드 실험실의 모든 글을 태그/시리즈/연도로 탐색합니다.',
  alternates: { canonical: '/posts/' },
  openGraph: {
    title: '모든 노트 | Frontend Lab',
    description: '프론트엔드 실험실의 모든 글을 태그/시리즈/연도로 탐색합니다.',
    url: 'https://blog.sangwook.dev/posts/',
    siteName: 'Frontend Lab',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Frontend Lab Blog Posts',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '모든 노트 | Frontend Lab',
    description: '프론트엔드 실험실의 모든 글을 태그/시리즈/연도로 탐색합니다.',
    images: ['/og-default.png'],
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
    '@id': `${SITE_URL}/posts/`,
    name: 'Posts | Frontend Lab',
    url: `${SITE_URL}/posts/`,
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
    inLanguage: 'ko',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: `${SITE_URL}/posts/${post.slug}/`,
        name: post.title,
      })),
    },
  };

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE_URL}/posts/#blog`,
    name: 'Frontend Lab — 실험 기록들',
    url: `${SITE_URL}/posts/`,
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionPageJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <PageBoundary transitionId="/posts">
        <div
          className={css({
            maxW: 'containerW',
            mx: 'auto',
            px: '8',
            py: { base: '10', md: '16' },
          })}
        >
          <header
            className={css({
              mb: '10',
              pb: '6',
              borderBottomWidth: '[1px]',
              borderColor: 'ink.border',
            })}
          >
            <Label tone="meta" className={css({ mb: '3', display: 'block' })}>
              POSTS / ARCHIVE
            </Label>
            <div
              className={css({
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '4',
                flexWrap: 'wrap',
              })}
            >
              <h1
                className={css({
                  fontFamily: 'serif',
                  fontSize: { base: '4xl', md: '5xl' },
                  fontWeight: 'medium',
                  letterSpacing: 'tightX',
                  color: 'ink.950',
                })}
              >
                모든 노트
              </h1>
              <span
                className={css({
                  fontFamily: 'mono',
                  fontSize: 'xs',
                  color: 'ink.500',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: 'mono',
                })}
              >
                {posts.length}편
              </span>
            </div>
          </header>

          <Suspense
            fallback={
              <div
                className={css({
                  py: '12',
                  textAlign: 'center',
                  fontFamily: 'mono',
                  fontSize: 'xs',
                  color: 'ink.500',
                })}
              >
                노트 불러오는 중…
              </div>
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
