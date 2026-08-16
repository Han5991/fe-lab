import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';
import type { Metadata } from 'next';

import {
  archiveUrl,
  getAllPostSummaries,
  getSeriesMeta,
  POSTS_PATH,
  sortPostsBySeriesOrder,
  type PostSummary,
} from '@blog/content';
import {
  SITE_URL,
  SITE_NAME,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
  SITE_DESCRIPTION_EXPANDED,
  OG_DEFAULT_IMAGE,
} from '@blog/content';
import { safeJsonLd } from '@blog/content';

import { Hero, FeaturedPost, PostIndexRow } from '@/src/components/blog';
import { OssStrip } from '@/src/components/home/OssStrip';
import { seriesBadgeLabel } from '@/src/components/home/seriesBadge';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';

// 제목은 meta·og·twitter 세 곳에 나가므로 한 번만 쓴다 — 한 곳만 고쳐지면
// 검색 결과와 공유 카드가 다른 말을 한다.
const PAGE_TITLE = `${SITE_NAME} | 프론트엔드 실험실`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: SITE_DESCRIPTION_EXPANDED,
  alternates: { canonical: '/' },
  openGraph: {
    title: PAGE_TITLE,
    description: SITE_DESCRIPTION_EXPANDED,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: `${SITE_URL}${OG_DEFAULT_IMAGE}`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Blog`,
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: SITE_DESCRIPTION_EXPANDED,
    images: [`${SITE_URL}${OG_DEFAULT_IMAGE}`],
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
          // `{search_term_string}`은 Google이 치환하는 템플릿 플레이스홀더라
          // 인코딩되면 안 된다 — archivePath({ q })를 거치면
          // `%7Bsearch_term_string%7D`가 되어 템플릿으로 인식되지 않는다.
          // 그래서 여기만 아카이브 절대 URL + 수동 쿼리로 조합한다.
          urlTemplate: `${archiveUrl()}?q={search_term_string}`,
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

/** 허브에 노출할 최근 글 수. 대표 글 1개는 제외한 나머지에서 센다. */
const RECENT_COUNT = 12;

/**
 * 대표 글의 시리즈 배지 문구. 시리즈 안 순서는 `_series.yml`의 `order`를 따르고
 * (없으면 날짜 오름차순) 글 상세의 시리즈 네비게이션과 같은 규칙을 씁니다.
 */
function buildSeriesLabel(
  post: PostSummary,
  allPosts: PostSummary[],
): string | undefined {
  // `series`는 `_series.yml`로 선언된 폴더에만 붙는다(`repository.ts`).
  // 주제별로 모아 둔 폴더의 글은 여기서 그대로 빠진다.
  if (!post.series) return undefined;
  const siblings = allPosts.filter(p => p.series === post.series);
  const meta = getSeriesMeta(post.series);
  const ordered = sortPostsBySeriesOrder(siblings, meta?.order);
  return seriesBadgeLabel(
    meta?.title ?? post.series,
    ordered.map(p => p.slug),
    post.slug,
  );
}

export default function HomePage() {
  const allPosts = getAllPostSummaries();
  const featured = allPosts[0];
  const recent = allPosts.slice(1, 1 + RECENT_COUNT);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <PageBoundary transitionId="/">
        <div className={cx(css({ bg: 'paper.50' }), railGutter)}>
          <div
            className={cx(
              railColumn({ width: 'text' }),
              css({ pt: '[36px]', pb: '[48px]' }),
            )}
          >
            <Hero />

            {featured && (
              <FeaturedPost
                post={featured}
                seriesLabel={buildSeriesLabel(featured, allPosts)}
              />
            )}

            {/* 장식 없는 텍스트 리스트. 행이 스스로 "마지막"인지 알 수 없어
                목록을 닫는 아래 보더는 여기서 :last-child로 붙인다. */}
            <ol
              aria-label="최근 글"
              className={css({
                listStyleType: 'none',
                p: '0',
                m: '0',
                '& > li:last-child > a': {
                  borderBottomWidth: 'hairline',
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'ink.border',
                },
              })}
            >
              {recent.map(post => (
                <li key={post.slug}>
                  <PostIndexRow post={post} />
                </li>
              ))}
            </ol>

            <Link
              href={POSTS_PATH}
              className={css({
                display: 'inline-block',
                mt: '[14px]',
                fontSize: '[13px]',
                color: 'accent.600',
                _hover: { textDecoration: 'underline' },
              })}
            >
              모든 글 →
            </Link>

            <OssStrip />
          </div>
        </div>
      </PageBoundary>
    </>
  );
}
