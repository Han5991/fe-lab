import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';
import type { Metadata } from 'next';
import {
  SITE_URL,
  SITE_NAME,
  OG_DEFAULT_IMAGE,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
  MERGED_PR_COUNT_FALLBACK,
  ABOUT_PAGE_MODIFIED,
  TITLE_SUFFIX,
} from '@/lib/constants';
import { safeJsonLd } from '@/lib/jsonLd';
import { Label } from '@/src/components/blog';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';
import { getAllPostSummaries } from '@/domain/post';
import { getAllSeries } from '@/domain/post/aggregate';

import { FEATURED_SERIES } from './featuredSeries';

const PAGE_TITLE = `소개${TITLE_SUFFIX}`;
// 공유 카드(og·twitter)용 짧은 소개. 검색 결과용 description과 일부러 다르다 —
// 카드는 한 줄로 읽히는 게 낫고, SERP는 길이 예산(120~160자)을 채워야 한다.
const SHARE_DESCRIPTION =
  '프론트엔드 엔지니어 한상욱(Sangwook Han). Mantine 27 PRs, Node.js 코어 기여, gemini-cli 74% 성능 개선. FEConf 2025 발표자.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description:
    '프론트엔드 엔지니어 한상욱(Sangwook Han)의 소개 페이지입니다. Mantine·Node.js·Next.js·gemini-cli 오픈소스 기여자이자 FEConf 2025·TeoConf 발표자. 번들러 내부와 TypeScript 설계를 파고듭니다.',
  alternates: { canonical: '/about/' },
  openGraph: {
    title: PAGE_TITLE,
    description: SHARE_DESCRIPTION,
    url: `${SITE_URL}/about/`,
    siteName: SITE_NAME,
    // 사람 소개 페이지라 website가 아니라 profile이다. 지정하지 않으면
    // og:type 자체가 빠져서 크롤러가 문서 종류를 추정하게 된다.
    type: 'profile',
    firstName: 'Sangwook',
    lastName: 'Han',
    username: 'Han5991',
    locale: 'ko_KR',
    images: [
      {
        url: `${SITE_URL}${OG_DEFAULT_IMAGE}`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Blog`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [`${SITE_URL}${OG_DEFAULT_IMAGE}`],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  '@id': `${SITE_URL}/about/`,
  url: `${SITE_URL}/about/`,
  name: '한상욱 (Sangwook Han) — About',
  dateCreated: '2024-12-01',
  // 빌드 시각을 넣으면 매일 cron 빌드마다 "수정됨"으로 보고되어 신호가 무의미해진다.
  // 이 페이지 내용을 실제로 고칠 때 상수를 갱신할 것 (sitemap lastmod와 같은 소스).
  dateModified: ABOUT_PAGE_MODIFIED,
  mainEntity: {
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
};

export default function AboutPage() {
  // PR 수만 비자명: CI가 빌드 타임에 NEXT_PUBLIC_PR_COUNT로 주입, 로컬·실패 시 폴백.
  // 폴백 값은 홈의 오픈소스 스트립과 같은 숫자를 보여야 해서 상수 하나를 공유한다.
  const blogPostCount = getAllPostSummaries().length;
  const mergedPrCount =
    process.env.NEXT_PUBLIC_PR_COUNT || MERGED_PR_COUNT_FALLBACK;
  const conferenceCount = '2';
  // 주요 시리즈 카드의 편수. 손으로 적어두면 글이 늘 때 조용히 어긋나므로
  // /series 페이지와 같은 집계원(getAllSeries)에서 그때그때 읽는다.
  const seriesCounts = new Map(getAllSeries().map(s => [s.id, s.count]));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <PageBoundary transitionId="/about">
        <div className={css({ bg: 'paper.50' })}>
          {/* Header */}
          {/* 배경은 화면 끝까지 가야 하므로 거터는 <header> 안쪽에 둔다 —
              레일만 감싸면 색 띠가 좌우로 잘린다. */}
          <header
            className={cx(
              css({
                bg: 'paper.100',
                borderBottomWidth: '[1px]',
                borderColor: 'ink.border',
              }),
              railGutter,
            )}
          >
            <div
              className={cx(
                railColumn('wide'),
                css({
                  py: { base: '14', md: '20' },
                  display: 'grid',
                  gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
                  gap: '12',
                  alignItems: 'end',
                }),
              )}
            >
              <div>
                <Label
                  tone="meta"
                  className={css({
                    display: 'block',
                    mb: '4',
                  })}
                >
                  PROFILE — FRONTEND ENGINEER
                </Label>
                <h1
                  className={css({
                    fontFamily: 'serif',
                    fontSize: { base: '5xl', md: '6xl' },
                    fontWeight: 'normal',
                    letterSpacing: 'tighter',
                    lineHeight: 'heroDense',
                    // 홈 히어로의 같은 이름과 맞춘다. 아래 로마자 부제와 소개
                    // 문단, 섹션 라벨은 무채색으로 남는다.
                    color: 'accent.900',
                    mb: '4',
                  })}
                >
                  한상욱
                  <span
                    className={css({
                      display: 'block',
                      fontSize: { base: 'lg', md: 'xl' },
                      fontWeight: 'normal',
                      color: 'ink.600',
                      mt: '1',
                      letterSpacing: 'normal',
                    })}
                  >
                    Sangwook Han
                  </span>
                </h1>
                <p
                  className={css({
                    fontFamily: 'serif',
                    fontSize: { base: 'md', md: 'lg' },
                    color: 'ink.700',
                    lineHeight: 'comfortable',
                    maxW: 'heroAside',
                  })}
                >
                  번들러 내부 구조, TypeScript 설계 패턴, 오픈소스 기여를
                  탐구합니다. 직접 실험하고 기록하며 배운 것들을 이 블로그에
                  남깁니다.
                </p>
              </div>

              <div
                className={css({
                  display: 'flex',
                  flexDir: 'column',
                  gap: '6',
                  alignSelf: 'start',
                  pt: { md: '8' },
                })}
              >
                <div
                  className={css({
                    display: 'flex',
                    gap: '3',
                    flexWrap: 'wrap',
                  })}
                >
                  <a
                    href={SITE_AUTHOR_GITHUB}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css({
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2',
                      px: '[16px]',
                      py: '[6px]',
                      bg: 'paper.200',
                      color: 'ink.800',
                      borderWidth: '[1px]',
                      borderStyle: 'solid',
                      borderColor: 'ink.border',
                      rounded: '[6px]',
                      fontSize: 'sm',
                      fontWeight: 'medium',
                      _hover: {
                        bg: 'paper.300',
                        borderColor: 'ink.borderStrong',
                      },
                      transition: '[background 0.15s, border-color 0.15s]',
                    })}
                  >
                    GitHub →
                  </a>
                  <a
                    href={SITE_AUTHOR_LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css({
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2',
                      px: '[16px]',
                      py: '[6px]',
                      bg: 'paper.200',
                      color: 'ink.800',
                      borderWidth: '[1px]',
                      borderStyle: 'solid',
                      borderColor: 'ink.border',
                      rounded: '[6px]',
                      fontSize: 'sm',
                      fontWeight: 'medium',
                      _hover: {
                        bg: 'paper.300',
                        borderColor: 'ink.borderStrong',
                      },
                      transition: '[background 0.15s, border-color 0.15s]',
                    })}
                  >
                    LinkedIn →
                  </a>
                </div>

                {/* Stats */}
                <div
                  className={css({
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6',
                    pt: '6',
                    borderTopWidth: '[1px]',
                    borderColor: 'ink.border',
                  })}
                >
                  {[
                    { value: String(blogPostCount), label: '블로그 포스트' },
                    { value: mergedPrCount, label: 'PR 승인' },
                    { value: conferenceCount, label: '컨퍼런스' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div
                        className={css({
                          fontFamily: 'serif',
                          fontSize: { base: '4xl', md: '5xl' },
                          fontWeight: 'normal',
                          color: 'ink.950',
                          letterSpacing: 'tight',
                          lineHeight: 'flat',
                          fontVariantNumeric: 'tabular-nums',
                        })}
                      >
                        {stat.value}
                      </div>
                      <div
                        className={css({
                          fontFamily: 'mono',
                          fontSize: '2xs',
                          color: 'ink.500',
                          letterSpacing: 'mono',
                          textTransform: 'uppercase',
                          mt: '1',
                        })}
                      >
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/posts/2025-retrospect/"
                  className={css({
                    fontFamily: 'mono',
                    fontSize: 'xs',
                    color: 'ink.500',
                    letterSpacing: 'monoXl',
                    _hover: { color: 'ink.950' },
                    transition: '[color 0.15s]',
                  })}
                >
                  2025 회고 전체 읽기 →
                </Link>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className={railGutter}>
            <div
              className={cx(
                railColumn('wide'),
                css({
                  py: { base: '12', md: '20' },
                  display: 'grid',
                  gridTemplateColumns: { base: '1fr', lg: '1fr 1fr' },
                  gap: { base: '12', lg: '16' },
                }),
              )}
            >
              {/* 오픈소스 기여 */}
              <section>
                <div
                  className={css({
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '3',
                    mb: '6',
                    pb: '4',
                    borderBottomWidth: '[1px]',
                    borderColor: 'ink.border',
                  })}
                >
                  <h2
                    className={css({
                      fontSize: { base: 'lg', md: 'xl' },
                      fontWeight: 'semibold',
                      color: 'ink.950',
                      letterSpacing: 'tight',
                    })}
                  >
                    오픈소스 기여
                  </h2>
                </div>
                <div>
                  {[
                    {
                      project: 'gemini-cli',
                      org: 'Google',
                      description:
                        'Promise.allSettled 병렬 처리로 성능 74% 개선 (408ms → 107ms).',
                      link: '/posts/ai-opensource-contribution',
                    },
                    {
                      project: 'Mantine',
                      org: 'Community',
                      description:
                        '27개 PR 병합. 컴포넌트 버그 수정 및 기능 개선.',
                      link: '/posts/first-open-source-contribution',
                    },
                    {
                      project: 'Node.js',
                      org: 'OpenJS Foundation',
                      description:
                        'util.inspect의 numeric separator 포매팅 버그 수정.',
                      link: '/posts/nodejs-contribution',
                    },
                    {
                      project: 'Next.js',
                      org: 'Vercel',
                      description: 'Next.js 코어 기여.',
                      link: '/posts/nextjs-contributor',
                    },
                  ].map(item => (
                    <Link
                      key={item.project}
                      href={item.link}
                      className={css({
                        display: 'block',
                        py: '5',
                        borderBottomWidth: '[1px]',
                        borderColor: 'ink.border',
                        transition:
                          '[background 0.15s, box-shadow 0.15s, padding 0.15s]',
                        _hover: {
                          bg: 'paper.100',
                          boxShadow: 'markerLeft',
                          pl: '4',
                        },
                      })}
                    >
                      <div
                        className={css({
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '2',
                          mb: '1.5',
                        })}
                      >
                        <span
                          className={css({
                            fontFamily: 'serif',
                            fontWeight: 'semibold',
                            fontSize: 'lg',
                            color: 'ink.950',
                          })}
                        >
                          {item.project}
                        </span>
                        <Label
                          tone="meta"
                          className={css({ letterSpacing: 'mono' })}
                        >
                          {item.org}
                        </Label>
                      </div>
                      <p
                        className={css({
                          fontSize: 'sm',
                          color: 'ink.700',
                          lineHeight: 'relaxed',
                        })}
                      >
                        {item.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>

              <div
                className={css({
                  display: 'flex',
                  flexDir: 'column',
                  gap: '12',
                })}
              >
                {/* 발표 */}
                <section>
                  <div
                    className={css({
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '3',
                      mb: '6',
                      pb: '4',
                      borderBottomWidth: '[1px]',
                      borderColor: 'ink.border',
                    })}
                  >
                    <h2
                      className={css({
                        fontSize: { base: 'lg', md: 'xl' },
                        fontWeight: 'semibold',
                        color: 'ink.950',
                        letterSpacing: 'tight',
                      })}
                    >
                      발표
                    </h2>
                  </div>
                  <div>
                    {[
                      {
                        event: 'FEConf 2025',
                        description:
                          '한국 최대 프론트엔드 컨퍼런스 라이트닝 토크',
                        link: '/posts/feconf-2025-lightning-speaker',
                      },
                      {
                        event: 'TeoConf',
                        description: '개발자 컨퍼런스 발표',
                        link: '/posts/2025-teoconf-presentation',
                      },
                    ].map(item => (
                      <Link
                        key={item.event}
                        href={item.link}
                        className={css({
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '4',
                          py: '4',
                          borderBottomWidth: '[1px]',
                          borderColor: 'ink.border',
                          transition:
                            '[background 0.15s, box-shadow 0.15s, padding 0.15s]',
                          _hover: {
                            bg: 'paper.100',
                            boxShadow: 'markerLeft',
                            pl: '4',
                          },
                        })}
                      >
                        <div>
                          <span
                            className={css({
                              fontFamily: 'serif',
                              fontWeight: 'semibold',
                              color: 'ink.950',
                              fontSize: 'md',
                              display: 'block',
                              mb: '0.5',
                            })}
                          >
                            {item.event}
                          </span>
                          <span
                            className={css({
                              fontSize: 'xs',
                              color: 'ink.500',
                            })}
                          >
                            {item.description}
                          </span>
                        </div>
                        <span
                          className={css({
                            fontFamily: 'mono',
                            fontSize: 'sm',
                            color: 'ink.500',
                            flexShrink: 0,
                          })}
                        >
                          →
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* 주요 시리즈 */}
                <section>
                  <div
                    className={css({
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '3',
                      mb: '6',
                      pb: '4',
                      borderBottomWidth: '[1px]',
                      borderColor: 'ink.border',
                    })}
                  >
                    <h2
                      className={css({
                        fontSize: { base: 'lg', md: 'xl' },
                        fontWeight: 'semibold',
                        color: 'ink.950',
                        letterSpacing: 'tight',
                      })}
                    >
                      주요 시리즈
                    </h2>
                  </div>
                  <div className={css({ display: 'flex', flexDir: 'column' })}>
                    {FEATURED_SERIES.map(series => (
                      // /series 페이지와 같은 링크 문법. 아카이브는 `tab`을 읽지
                      // 않고 `q`는 series와 AND로 걸리므로 series 하나만 넘긴다.
                      <Link
                        key={series.id}
                        href={`/posts/?series=${encodeURIComponent(series.id)}`}
                        className={css({
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          gap: '4',
                          py: '4',
                          borderBottomWidth: '[1px]',
                          borderColor: 'ink.border',
                          transition:
                            '[background 0.15s, box-shadow 0.15s, padding 0.15s]',
                          _hover: {
                            bg: 'paper.100',
                            boxShadow: 'markerLeft',
                            pl: '4',
                          },
                        })}
                      >
                        <div className={css({ flex: '1', minW: '0' })}>
                          <span
                            className={css({
                              fontFamily: 'serif',
                              fontWeight: 'semibold',
                              color: 'ink.950',
                              fontSize: 'md',
                              display: 'block',
                              mb: '1',
                            })}
                          >
                            {series.title}
                          </span>
                          <p
                            className={css({
                              fontSize: 'xs',
                              color: 'ink.700',
                              lineHeight: 'relaxed',
                            })}
                          >
                            {series.description}
                          </p>
                        </div>
                        {/* 폴더가 사라지면 집계에도 없다 — 0편 대신 배지를 뺀다.
                          (테스트가 막지만 렌더는 fail-soft로 둔다) */}
                        {seriesCounts.has(series.id) && (
                          <span
                            className={css({
                              fontFamily: 'mono',
                              fontSize: '2xs',
                              color: 'marker.600',
                              letterSpacing: 'monoXl',
                              textTransform: 'uppercase',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                              pt: '0.5',
                            })}
                          >
                            {seriesCounts.get(series.id)}편
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </PageBoundary>
    </>
  );
}
