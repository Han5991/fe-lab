import { Suspense } from 'react';
import { getAllPosts } from '@/lib/posts';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import type { Metadata } from 'next';

import { PostsFilter } from '@/src/components/post/PostsFilter';

export const metadata: Metadata = {
  title: 'Posts | Frontend Lab',
  description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
  alternates: {
    canonical: '/posts',
  },
  openGraph: {
    title: 'Posts | Frontend Lab',
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
    url: 'https://blog.sangwook.dev/posts',
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Posts | Frontend Lab',
  url: 'https://blog.sangwook.dev/posts',
  description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
  isPartOf: {
    '@type': 'WebSite',
    name: 'Frontend Lab',
    url: 'https://blog.sangwook.dev',
  },
};

export default function PostsPage() {
  const posts = getAllPosts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SsgoiTransition id="/posts">
        <div
          className={css({
            maxW: '800px',
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
        </div>
      </SsgoiTransition>
    </>
  );
}
