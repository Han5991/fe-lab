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

  // 태그 & 시리즈 목록 추출 (빈도순 정렬)
  const tagCounts = new Map<string, number>();
  const seriesSet = new Set<string>();

  for (const post of posts) {
    if (post.tags) {
      for (const tag of post.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    if (post.series) {
      seriesSet.add(post.series);
    }
  }

  const allTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
  const allSeries = [...seriesSet];

  const postsData = posts.map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt || '',
    tags: p.tags,
    series: p.series,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SsgoiTransition id="/posts">
        <div
          className={css({
            maxWidth: '800px',
            margin: '0 auto',
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

          <PostsFilter posts={postsData} allTags={allTags} allSeries={allSeries} />
        </div>
      </SsgoiTransition>
    </>
  );
}
