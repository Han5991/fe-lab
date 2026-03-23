import { Suspense } from 'react';
import { getAllPosts } from '@/lib/posts';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import type { Metadata } from 'next';

import { PostsArchive } from '@/src/components/post/PostsArchive';
import { PostsFilter } from '@/src/components/post/PostsFilter';

export const metadata: Metadata = {
  title: 'Posts | Frontend Lab',
  description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
  alternates: {
    canonical: '/posts/',
  },
  openGraph: {
    title: 'Posts | Frontend Lab',
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
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
    title: 'Posts | Frontend Lab',
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
    images: ['/og-default.png'],
  },
};

export default function PostsPage() {
  const posts = getAllPosts();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://blog.sangwook.dev/posts/',
    name: 'Posts | Frontend Lab',
    url: 'https://blog.sangwook.dev/posts/',
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
    inLanguage: 'ko',
    isPartOf: { '@id': 'https://blog.sangwook.dev/#website' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://blog.sangwook.dev/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Posts',
          item: 'https://blog.sangwook.dev/posts/',
        },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.slice(0, 20).map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://blog.sangwook.dev/posts/${post.slug}/`,
        name: post.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SsgoiTransition id="/posts">
        <div
          className={css({
            maxW: '1200px',
            m: '0 auto',
            px: '6',
            py: { base: '8', md: '16' },
          })}
        >
          <header className={css({ mb: '8' })}>
            <h1
              className={css({
                fontSize: { base: '3xl', md: '4xl' },
                fontWeight: 'bold',
                letterSpacing: 'tight',
                color: 'gray.900',
              })}
            >
              실험 기록들
            </h1>
            <p className={css({ color: 'gray.600', mt: '2' })}>
              총 {posts.length}개의 기록이 있습니다.
            </p>
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
