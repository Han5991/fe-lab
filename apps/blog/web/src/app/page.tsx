import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { Metadata } from 'next';

import { getAllPostSummaries } from '@/domain/post';
import { getAllSeries } from '@/domain/post/aggregate';
import {
  SITE_URL,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
  SITE_DESCRIPTION_EXPANDED,
} from '@/lib/constants';
import { safeJsonLd } from '@/lib/jsonLd';

import {
  Hero,
  FeaturedPost,
  MiniPostCard,
  SeriesCard,
  PostIndexRow,
  PopularRail,
  SearchBox,
  Label,
} from '@/src/components/blog';
import { PageBoundary } from '@/src/components/PageBoundary';

export const metadata: Metadata = {
  title: 'Frontend Lab | 프론트엔드 실험실',
  description: SITE_DESCRIPTION_EXPANDED,
  alternates: { canonical: '/' },
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
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo-wordmark.svg`,
        width: 280,
        height: 60,
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
      image: {
        '@type': 'ImageObject',
        url: 'https://github.com/Han5991.png?size=400',
        width: 400,
        height: 400,
      },
      jobTitle: 'Frontend Engineer',
      description:
        '번들러 내부 구조, TypeScript 설계 패턴, 오픈소스 기여를 탐구하는 프론트엔드 엔지니어. Mantine, Node.js, gemini-cli, Next.js 오픈소스 기여자.',
      knowsAbout: [
        'React',
        'TypeScript',
        'JavaScript',
        'Module Bundlers',
        'Frontend Architecture',
        'Open Source',
      ],
      sameAs: [SITE_AUTHOR_GITHUB, SITE_AUTHOR_LINKEDIN],
    },
  ],
};

export default function HomePage() {
  const allPosts = getAllPostSummaries();
  const featured = allPosts[0];
  const sideTwo = allPosts.slice(1, 3);
  const recent = allPosts.slice(3, 13);
  const series = getAllSeries().slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <PageBoundary transitionId="/">
        <div className={css({ bg: 'paper.50' })}>
          <Hero />

          {/* Featured + Side stack */}
          {featured && (
            <section
              className={css({
                pt: '6',
                pb: { base: '10', md: '14' },
                borderTopWidth: '[1px]',
                borderColor: 'ink.border',
              })}
            >
              <div
                className={css({
                  maxW: 'containerW',
                  mx: 'auto',
                  px: '8',
                  pt: { base: '8', md: '10' },
                  display: 'grid',
                  gridTemplateColumns: { base: '1fr', md: '7fr 5fr' },
                  gap: { base: '10', md: '12' },
                })}
              >
                <FeaturedPost post={featured} />

                <aside
                  className={css({
                    display: 'flex',
                    flexDir: 'column',
                    gap: '6',
                  })}
                >
                  <SearchBox
                    placeholder="이 노트장에서 찾기…"
                    href="/posts/?focus=search"
                  />
                  <div>
                    {/* 바로 아래 MiniPostCard가 h4라, 이 라벨이 span이면
                        FeaturedPost의 h2에서 h4로 두 단계를 건너뛴다. */}
                    <Label
                      as="h3"
                      tone="meta"
                      className={css({
                        display: 'block',
                        mb: '4',
                        pb: '3',
                        borderBottomWidth: '[1px]',
                        borderColor: 'ink.border',
                      })}
                    >
                      이번 주 함께 읽기 좋은 글
                    </Label>
                    <div>
                      {sideTwo.map((p, i) => (
                        <MiniPostCard
                          key={p.slug}
                          post={p}
                          withDivider={i > 0}
                        />
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          )}

          {/* Series shelf */}
          {series.length > 0 && (
            <section
              className={css({
                bg: 'paper.100',
                borderTopWidth: '[1px]',
                borderBottomWidth: '[1px]',
                borderColor: 'ink.border',
                py: { base: '12', md: '16' },
              })}
            >
              <div className={css({ maxW: 'containerW', mx: 'auto', px: '8' })}>
                <div
                  className={css({
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '3',
                    mb: '6',
                    pb: '3',
                    borderBottomWidth: '[1px]',
                    borderColor: 'ink.border',
                  })}
                >
                  <h2
                    className={css({
                      fontSize: { base: 'md', md: 'lg' },
                      fontWeight: 'semibold',
                      color: 'ink.950',
                    })}
                  >
                    시리즈로 묶어서 보기
                  </h2>
                  <span className={css({ flex: '1' })} />
                  <Link
                    href="/posts/"
                    className={css({
                      fontSize: 'sm',
                      color: 'accent.600',
                      _hover: { textDecoration: 'underline' },
                    })}
                  >
                    모두 보기 →
                  </Link>
                </div>
                <div
                  className={css({
                    display: 'grid',
                    gridTemplateColumns: {
                      base: '1fr',
                      md: '[repeat(2, 1fr)]',
                      lg: '[repeat(3, 1fr)]',
                    },
                    gap: '6',
                  })}
                >
                  {series.map((s, i) => (
                    <SeriesCard key={s.id} series={s} index={i} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Recent + Popular */}
          <section
            className={css({
              py: { base: '12', md: '16' },
              maxW: 'containerW',
              mx: 'auto',
              px: '8',
            })}
          >
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', md: '8fr 4fr' },
                gap: { base: '10', md: '16' },
              })}
            >
              <div>
                <div
                  className={css({
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '3',
                    mb: '4',
                    pb: '3',
                    borderBottomWidth: '[1px]',
                    borderColor: 'ink.border',
                  })}
                >
                  <h2
                    className={css({
                      fontSize: { base: 'md', md: 'lg' },
                      fontWeight: 'semibold',
                      color: 'ink.950',
                    })}
                  >
                    최근 노트
                  </h2>
                  <span className={css({ flex: '1' })} />
                  <Link
                    href="/posts/"
                    className={css({
                      fontSize: 'sm',
                      color: 'accent.600',
                      _hover: { textDecoration: 'underline' },
                    })}
                  >
                    모두 보기 →
                  </Link>
                </div>
                <ol className={css({ listStyleType: 'none', p: '0', m: '0' })}>
                  {/* PostIndexRow의 루트는 <a>다. <ol> 바로 밑에 두면 목록
                      구조가 깨진다(axe list, impact serious). PopularRail·
                      PostsArchive와 같이 <li>로 감싼다. */}
                  {recent.map(p => (
                    <li key={p.slug}>
                      <PostIndexRow post={p} />
                    </li>
                  ))}
                </ol>
              </div>

              {/* PopularRail은 내부에서 useQuery + 자체 fallback. Suspense 불필요. */}
              <PopularRail posts={allPosts} />
            </div>
          </section>
        </div>
      </PageBoundary>
    </>
  );
}
