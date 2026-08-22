import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';
import type { Metadata } from 'next';

import {
  archivePath,
  getAllPostSummaries,
  POSTS_PATH,
  postPath,
} from '@blog/content';
import { getAllSeries, getSeriesMeta } from '@/src/content';
import { fmtDate } from '@blog/content';
import { OG_DEFAULT_IMAGE, SITE_NAME, SITE_URL } from '@blog/content';
import { safeJsonLd } from '@blog/content';
import { HiddenPostBadge } from '@/src/components/blog/HiddenPostBadge';
import {
  postRowItem,
  postRowLink,
  postRowMeta,
  postRowMetaRaw,
  postRowTitle,
} from '@/src/components/blog/postRow';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';

import { attachSeriesPosts } from './seriesIndex';

const PAGE_TITLE = `시리즈 | ${SITE_NAME}`;
const PAGE_DESCRIPTION =
  '여러 편으로 이어지는 글을 시리즈로 묶었습니다. 번들러 직접 만들기, TypeScript로 설계하는 프로젝트, 우아한 에러 핸들링, ECS 배포 파이프라인까지 — 시리즈마다 1편부터 순서대로, 중간에 길을 잃지 않고 읽을 수 있습니다.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/series/' },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/series/`,
    siteName: SITE_NAME,
    images: [
      {
        url: `${SITE_URL}${OG_DEFAULT_IMAGE}`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Series`,
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [`${SITE_URL}${OG_DEFAULT_IMAGE}`],
  },
};

// 레퍼런스 .badge — 배경 accent.50 + 글자 accent.600. 선/아이콘이 아니라
// 텍스트라 accent.500이 아닌 600을 쓴다(라이트에서 500은 AA 미달).
const seriesBadge = css({
  display: 'inline-block',
  fontFamily: 'sans',
  fontSize: '[12px]',
  lineHeight: 'snug',
  color: 'accent.600',
  bg: 'accent.50',
  rounded: '[6px]',
  px: '[9px]',
  py: '[2px]',
});

export default function SeriesPage() {
  const posts = getAllPostSummaries();
  // getAllSeries()는 최근 갱신 순으로 정렬해 돌려준다. 시리즈 "안"의 순서만
  // _series.yml의 order(없으면 날짜 오름차순)로 다시 잡는다.
  const series = attachSeriesPosts(
    getAllSeries(),
    posts,
    id => getSeriesMeta(id)?.order,
  );
  const seriesPostCount = series.reduce((sum, s) => sum + s.posts.length, 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/series/`,
    name: `시리즈 | ${SITE_NAME}`,
    url: `${SITE_URL}/series/`,
    description: PAGE_DESCRIPTION,
    inLanguage: 'ko',
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <PageBoundary transitionId="/series">
        <div className={cx(css({ bg: 'paper.50' }), railGutter)}>
          {/* 허브 계열 페이지는 홈·글 본문과 같은 text 레일을 쓴다. */}
          <div
            className={cx(
              railColumn({ width: 'text' }),
              css({ py: { base: '10', md: '16' } }),
            )}
          >
            <header className={css({ mb: '[30px]' })}>
              <h1
                className={css({
                  fontSize: '[21px]',
                  fontWeight: 'bold',
                  color: 'ink.950',
                  mb: '[8px]',
                })}
              >
                시리즈
              </h1>
              <p
                className={css({
                  fontSize: '[14px]',
                  color: 'ink.600',
                  lineHeight: 'relaxed',
                })}
              >
                {PAGE_DESCRIPTION}
              </p>
              {series.length > 0 && (
                <p className={css(postRowMetaRaw, { mt: '[10px]' })}>
                  {series.length}개 시리즈 · {seriesPostCount}편
                </p>
              )}
            </header>

            {series.length === 0 ? (
              <p
                className={css({
                  py: '[24px]',
                  borderTopWidth: '[1px]',
                  borderTopStyle: 'solid',
                  borderColor: 'ink.border',
                  fontSize: '[14px]',
                  color: 'ink.600',
                })}
              >
                아직 묶인 시리즈가 없습니다.{' '}
                <Link
                  href={POSTS_PATH}
                  className={css({
                    color: 'accent.600',
                    _hover: { textDecorationLine: 'underline' },
                  })}
                >
                  전체 글 목록
                </Link>
                에서 모든 글을 볼 수 있습니다.
              </p>
            ) : (
              series.map(entry => (
                <section
                  key={entry.id}
                  className={css({ mb: '[34px]', _last: { mb: '0' } })}
                >
                  <div
                    className={css({
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: '[16px]',
                      mb: '[8px]',
                    })}
                  >
                    {/* 배지 자체가 그 시리즈로 필터된 아카이브로 가는 링크다.
                        (글 목록 행이 h3라 시리즈 제목은 h2로 둔다) */}
                    <h2 className={css({ minW: '0' })}>
                      <Link
                        href={archivePath({ series: entry.id })}
                        className={css({
                          display: 'inline-block',
                          _hover: { textDecorationLine: 'underline' },
                        })}
                      >
                        <span className={seriesBadge}>{entry.title}</span>
                      </Link>
                    </h2>
                    <span className={postRowMeta}>{entry.posts.length}편</span>
                  </div>

                  {entry.description && (
                    <p
                      className={css({
                        fontSize: '[13px]',
                        color: 'ink.600',
                        lineHeight: 'relaxed',
                        mb: '[10px]',
                      })}
                    >
                      {entry.description}
                    </p>
                  )}

                  <ol
                    className={css({ listStyleType: 'none', p: '0', m: '0' })}
                  >
                    {entry.posts.map(post => (
                      <li key={post.slug} className={postRowItem}>
                        <Link
                          href={postPath(post.slug)}
                          className={postRowLink}
                        >
                          <h3 className={postRowTitle}>
                            {post.title}
                            <HiddenPostBadge post={post} />
                          </h3>
                          <span className={postRowMeta}>
                            {fmtDate(post.date)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              ))
            )}
          </div>
        </div>
      </PageBoundary>
    </>
  );
}
