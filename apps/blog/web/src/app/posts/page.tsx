import { Suspense } from 'react';
import { getAllPostSummaries } from '@/lib/posts';
import { SITE_URL } from '@/lib/constants';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import type { Metadata } from 'next';

import { PostsArchive } from '@/src/components/post/PostsArchive';
import { PostsFilter } from '@/src/components/post/PostsFilter';

export const metadata: Metadata = {
  title: 'Posts | Frontend Lab',
  description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
  alternates: { canonical: '/posts/' },
  openGraph: {
    title: 'Posts | Frontend Lab',
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
    url: 'https://blog.sangwook.dev/posts/',
    siteName: 'Frontend Lab',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Frontend Lab Blog Posts' }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Posts | Frontend Lab',
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
    images: ['/og-default.png'],
  },
};

export default function PostsPage() {
  const posts = getAllPostSummaries();

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
    description: '프론트엔드 실험실의 모든 기록들. React, TypeScript, 번들러 시리즈 등.',
    inLanguage: 'ko',
    author: { '@id': `${SITE_URL}/#author` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <SsgoiTransition id="/posts">
        <div
          className={css({
            maxW: '1200px',
            m: '0 auto',
            px: '6',
            py: { base: '10', md: '16' },
          })}
        >
          <header
            className={css({
              mb: '10',
              pb: '8',
              borderBottomWidth: '1px',
              borderColor: 'ink.border',
            })}
          >
            <p
              className={css({
                fontSize: 'xs',
                fontWeight: 'bold',
                letterSpacing: 'widest',
                textTransform: 'uppercase',
                color: 'accent.600',
                mb: '3',
              })}
            >
              Archive
            </p>
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
                  fontSize: { base: '3xl', md: '4xl' },
                  fontWeight: 'extrabold',
                  letterSpacing: 'tight',
                  color: 'ink.950',
                })}
              >
                실험 기록들
              </h1>
              <span
                className={css({
                  fontSize: 'sm',
                  color: 'ink.500',
                  fontVariantNumeric: 'tabular-nums',
                })}
              >
                총 {posts.length}편
              </span>
            </div>
          </header>

          <Suspense>
            <PostsFilter posts={posts} />
          </Suspense>

          <PostsArchive posts={posts} />
        </div>
      </SsgoiTransition>
    </>
  );
}
