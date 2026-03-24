import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import { getAllPostSummaries } from '@/lib/posts';
import { TopPosts, TopPostsLoading } from '@/src/components/home/TopPosts';
import { PostCard } from '@/src/components/home/PostCard';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  SITE_URL,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
  SITE_DESCRIPTION_EXPANDED,
} from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Frontend Lab | 프론트엔드 실험실',
  description: SITE_DESCRIPTION_EXPANDED,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Frontend Lab | 프론트엔드 실험실',
    description: SITE_DESCRIPTION_EXPANDED,
    url: 'https://blog.sangwook.dev',
    siteName: 'Frontend Lab',
    images: [{ url: 'https://blog.sangwook.dev/og-default.png', width: 1200, height: 630, alt: 'Frontend Lab Blog' }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontend Lab | 프론트엔드 실험실',
    description: SITE_DESCRIPTION_EXPANDED,
    images: ['https://blog.sangwook.dev/og-default.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Frontend Lab',
      alternateName: '프론트엔드 실험실',
      url: SITE_URL,
      description: SITE_DESCRIPTION_EXPANDED,
      inLanguage: 'ko',
      publisher: { '@id': `${SITE_URL}/#organization` },
      author: { '@id': `${SITE_URL}/#author` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/posts/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Frontend Lab',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-default.png`, width: 1200, height: 630 },
      description: SITE_DESCRIPTION_EXPANDED,
      founder: { '@id': `${SITE_URL}/#author` },
      sameAs: [SITE_AUTHOR_GITHUB, SITE_AUTHOR_LINKEDIN],
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#author`,
      name: 'Sangwook Han',
      alternateName: '한상욱',
      url: SITE_URL,
      jobTitle: 'Frontend Engineer',
      sameAs: [SITE_AUTHOR_GITHUB, SITE_AUTHOR_LINKEDIN],
    },
  ],
};

export default function HomePage() {
  const allPosts = getAllPostSummaries();
  const recentPosts = allPosts.slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SsgoiTransition id="/">
        <div className={css({ bg: 'ink.25' })}>

          {/* Hero — left-aligned, asymmetric, typographic */}
          <div
            className={css({
              borderBottomWidth: '1px',
              borderColor: 'ink.border',
              bg: 'ink.50',
            })}
          >
            <main
              className={css({
                maxW: '1200px',
                mx: 'auto',
                px: '6',
                py: { base: '16', md: '24' },
                display: 'grid',
                gridTemplateColumns: { base: '1fr', md: '7fr 3fr' },
                gap: '16',
                alignItems: 'end',
              })}
            >
              <div>
                <p
                  className={css({
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    letterSpacing: 'widest',
                    textTransform: 'uppercase',
                    color: 'accent.600',
                    mb: '6',
                  })}
                >
                  Frontend Engineering · 한상욱
                </p>
                <h1
                  className={css({
                    fontSize: { base: '4xl', md: '6xl', lg: '7xl' },
                    fontWeight: 'extrabold',
                    letterSpacing: 'tight',
                    lineHeight: '1.05',
                    mb: '8',
                    color: 'ink.950',
                  })}
                >
                  번들러 밑바닥부터
                  <br />
                  대규모 아키텍처까지
                </h1>
                <p
                  className={css({
                    fontSize: { base: 'base', md: 'lg' },
                    color: 'ink.700',
                    lineHeight: '1.7',
                    maxW: '540px',
                    mb: '10',
                  })}
                >
                  실험하고 기록하며 성장하는 프론트엔드 엔지니어의 공간.
                  TypeScript 설계 패턴, 번들러 내부 구조, 오픈소스 기여 경험을 공유합니다.
                </p>
                <div className={css({ display: 'flex', gap: '3', flexWrap: 'wrap' })}>
                  <Link
                    href="/posts/"
                    className={css({
                      px: '6',
                      py: '3',
                      bg: 'ink.950',
                      color: 'ink.25',
                      rounded: 'lg',
                      fontWeight: 'semibold',
                      fontSize: 'sm',
                      transition: 'opacity 0.15s',
                      _hover: { opacity: '0.85' },
                    })}
                  >
                    실험 기록 읽기
                  </Link>
                  <Link
                    href="/about/"
                    className={css({
                      px: '6',
                      py: '3',
                      bg: 'transparent',
                      color: 'ink.700',
                      rounded: 'lg',
                      fontWeight: 'semibold',
                      fontSize: 'sm',
                      borderWidth: '1px',
                      borderColor: 'ink.border',
                      transition: 'all 0.15s',
                      _hover: {
                        borderColor: 'ink.borderStrong',
                        color: 'ink.950',
                      },
                    })}
                  >
                    소개 보기
                  </Link>
                </div>
              </div>

              {/* Side stats */}
              <div
                className={css({
                  display: { base: 'none', md: 'flex' },
                  flexDir: 'column',
                  gap: '6',
                  pb: '2',
                })}
              >
                {[
                  { num: '33+', label: '작성한 글' },
                  { num: '38', label: '오픈소스 PR' },
                  { num: '3', label: '컨퍼런스 발표' },
                ].map(s => (
                  <div key={s.label}>
                    <div
                      className={css({
                        fontSize: '3xl',
                        fontWeight: 'extrabold',
                        color: 'ink.950',
                        letterSpacing: 'tight',
                        lineHeight: '1',
                      })}
                    >
                      {s.num}
                    </div>
                    <div
                      className={css({
                        fontSize: 'xs',
                        color: 'ink.500',
                        mt: '1',
                      })}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </main>
          </div>

          {/* Popular Posts */}
          <Suspense fallback={<TopPostsLoading />}>
            <TopPosts posts={allPosts} />
          </Suspense>

          {/* Recent Posts */}
          <section
            className={css({
              py: { base: '12', md: '20' },
              maxW: '1200px',
              mx: 'auto',
              px: '6',
              borderTopWidth: '1px',
              borderColor: 'ink.border',
            })}
          >
            <div
              className={css({
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                mb: '10',
              })}
            >
              <div className={css({ display: 'flex', alignItems: 'baseline', gap: '4' })}>
                <span
                  className={css({
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    color: 'accent.600',
                    letterSpacing: 'widest',
                    textTransform: 'uppercase',
                  })}
                >
                  02
                </span>
                <h2
                  className={css({
                    fontSize: { base: 'xl', md: '2xl' },
                    fontWeight: 'bold',
                    color: 'ink.950',
                    letterSpacing: 'tight',
                  })}
                >
                  최근 기록
                </h2>
              </div>
              <Link
                href="/posts/"
                className={css({
                  fontSize: 'sm',
                  color: 'ink.500',
                  _hover: { color: 'accent.600' },
                  transition: 'color 0.15s',
                })}
              >
                전체 보기 →
              </Link>
            </div>
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)' },
                borderTopWidth: '1px',
                borderColor: 'ink.border',
              })}
            >
              {recentPosts.map((post, i) => (
                <PostCard key={post.slug} post={post} index={i} />
              ))}
            </div>
          </section>
        </div>
      </SsgoiTransition>
    </>
  );
}
