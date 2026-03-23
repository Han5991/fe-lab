import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import { getAllPosts } from '@/lib/posts';
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
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Frontend Lab | 프론트엔드 실험실',
    description: SITE_DESCRIPTION_EXPANDED,
    url: 'https://blog.sangwook.dev',
    siteName: 'Frontend Lab',
    images: [
      {
        url: 'https://blog.sangwook.dev/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Frontend Lab Blog',
      },
    ],
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
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/posts/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Frontend Lab',
      alternateName: '프론트엔드 실험실',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/og-default.png`,
        width: 1200,
        height: 630,
      },
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
      description:
        '프론트엔드 엔지니어. 번들러, 디자인 패턴, 오픈소스 기여를 주로 다룹니다.',
      inLanguage: 'ko',
      knowsAbout: [
        'Frontend Engineering',
        'TypeScript',
        'React',
        'Next.js',
        'Bundlers',
        'Design Patterns',
        'Open Source',
      ],
      sameAs: [SITE_AUTHOR_GITHUB, SITE_AUTHOR_LINKEDIN],
    },
  ],
};

export default function HomePage() {
  const allPosts = getAllPosts();
  const recentPosts = allPosts.slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SsgoiTransition id="/">
        <div
          className={css({
            minHeight: 'calc(100lvh - 231px)',
            bg: 'white',
          })}
        >
          {/* Hero Section */}
          <div
            className={css({
              display: 'flex',
              flexDir: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: '20',
              px: '6',
              textAlign: 'center',
              bg: 'gray.50',
              borderBottomWidth: '1px',
              borderColor: 'gray.100',
            })}
          >
            <main className={css({ maxWidth: '2xl', w: 'full' })}>
              <div
                className={css({
                  display: 'inline-block',
                  px: '3',
                  py: '1',
                  rounded: 'full',
                  bg: 'blue.50',
                  color: 'blue.600',
                  fontSize: 'xs',
                  fontWeight: 'semibold',
                  mb: '6',
                  borderWidth: '1px',
                  borderColor: 'blue.100',
                })}
              >
                Welcome to FE Lab
              </div>
              <h1
                className={css({
                  fontSize: { base: '5xl', md: '7xl' },
                  fontWeight: 'extrabold',
                  letterSpacing: 'tight',
                  lineHeight: '1.1',
                  mb: '6',
                  color: 'gray.900',
                })}
              >
                Frontend <br />
                <span
                  className={css({
                    bgGradient: 'to-r',
                    gradientFrom: 'blue.600',
                    gradientTo: 'purple.600',
                    bgClip: '[text]',
                    color: 'transparent',
                  })}
                >
                  Experiment Lab
                </span>
              </h1>
              <p
                className={css({
                  fontSize: { base: 'lg', md: 'xl' },
                  color: 'gray.600',
                  mb: '10',
                  lineHeight: 'relaxed',
                })}
              >
                번들러 밑바닥부터 대규모 아키텍처까지, <br />
                실험하고 기록하며 성장하는 프론트엔드 엔지니어의 공간입니다.
              </p>

              <div
                className={css({
                  display: 'flex',
                  gap: '4',
                  justifyContent: 'center',
                })}
              >
                <Link
                  href="/posts/"
                  className={css({
                    px: '8',
                    py: '4',
                    bg: 'gray.900',
                    color: 'white',
                    rounded: 'xl',
                    fontWeight: 'semibold',
                    transition: 'all 0.2s',
                    _hover: {
                      bg: 'gray.800',
                      transform: 'translateY(-2px)',
                      shadow: 'lg',
                    },
                    _active: { transform: 'translateY(0)' },
                  })}
                >
                  실험 기록 읽기
                </Link>
              </div>
            </main>
          </div>

          {/* Top Posts Section (Client Component) */}
          <Suspense fallback={<TopPostsLoading />}>
            <TopPosts posts={allPosts} />
          </Suspense>

          {/* Recent Posts Section */}
          <section
            className={css({
              py: '20',
              px: '6',
              maxW: '7xl',
              mx: 'auto',
              borderTopWidth: '1px',
              borderColor: 'gray.100',
            })}
          >
            <h2
              className={css({
                fontSize: '3xl',
                fontWeight: 'bold',
                mb: '10',
                textAlign: 'center',
              })}
            >
              ✨ 최근 등록된 실험 기록
            </h2>
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', md: '3fr' },
                gap: '8',
              })}
            >
              {recentPosts.map(post => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
            <div className={css({ mt: '12', textAlign: 'center' })}>
              <Link
                href="/posts/"
                className={css({
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: '6',
                  py: '3',
                  rounded: 'full',
                  borderWidth: '1px',
                  borderColor: 'gray.200',
                  color: 'gray.600',
                  fontWeight: 'semibold',
                  transition: 'all 0.2s',
                  _hover: {
                    borderColor: 'blue.600',
                    color: 'blue.600',
                    bg: 'blue.50',
                  },
                })}
              >
                모든 기록 보기 <span className={css({ ml: '2' })}>→</span>
              </Link>
            </div>
          </section>
        </div>
      </SsgoiTransition>
    </>
  );
}
