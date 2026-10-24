import { AUTHOR_GITHUB, AUTHOR_LINKEDIN } from '@/content.values.mts';
import Link from 'next/link';
import { css, cx } from '@blog/styled-system/css';

import { safeJsonLd } from '@blog/content/client';
import { Label } from '@/src/components/blog';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';
import { archivePath, postPath } from '@blog/content/client';

import { getAboutStats, getSeriesPostCounts } from './counts';
import { FEATURED_SERIES } from './featuredSeries';
import { buildAboutJsonLd, buildAboutMetadata } from './seo';

export const metadata = buildAboutMetadata();

const jsonLd = buildAboutJsonLd();

// 목록 행(오픈소스·발표·시리즈) hover — 지면을 한 단계 올리고 왼쪽에 강조 막대를 세운다.
// 막대는 2px(Astryx Outline·Tab 선택 표식과 같은 굵기)의 의사 요소다. 예전엔 inset
// box-shadow였는데, 그림자는 떠 있는 표면에만 쓴다(AGENTS.md §9). 굵기는 획이라 px로
// 고정한다 — sizes 스케일의 `0.5`도 기본 글자 크기에선 2px지만 rem이라 루트 글자 크기를
// 따라 굵기가 변한다. 세 목록이 같은 객체를 `css(hoverRow, …)`로 합친다 — 행마다
// 레이아웃만 다르다.
const hoverRow = css.raw({
  pos: 'relative',
  // 왼쪽 여백이 늘며 행이 밀려난다 — 단축 유틸리티 목록에 padding이 없어 속성을 직접 고른다.
  transitionProperty: 'background-color, padding-left',
  transitionDuration: 'fast',
  transitionTimingFunction: 'standard',
  _hover: {
    bg: 'paper.100',
    pl: '4',
    _before: {
      content: '""',
      pos: 'absolute',
      insetY: '0',
      left: '0',
      w: '[2px]',
      bg: 'accent.solid',
    },
  },
});

export default function AboutPage() {
  // 콘텐츠 집계를 읽는 값이라 컴포넌트 안에서 부른다 — 이유는 counts.ts 참고.
  const stats = getAboutStats();
  const seriesPostCounts = getSeriesPostCounts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <PageBoundary>
        <div className={css({ bg: 'paper.50' })}>
          {/* Header */}
          {/* 배경은 화면 끝까지 가야 하므로 거터는 <header> 안쪽에 둔다 —
              레일만 감싸면 색 띠가 좌우로 잘린다. */}
          <header
            className={cx(
              css({
                bg: 'paper.100',
                borderBottomWidth: 'hairline',
                borderColor: 'ink.border',
              }),
              railGutter,
            )}
          >
            <div
              className={cx(
                railColumn({ width: 'wide' }),
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
                    // 홈 히어로의 같은 이름과 맞춘다 — 제목은 본문과 같은 잉크이고,
                    // 위계는 크기가 낸다. 아래 로마자 부제는 ink.600으로 한 단계 물러난다.
                    color: 'ink.950',
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
                    href={AUTHOR_GITHUB}
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
                      borderWidth: 'hairline',
                      borderStyle: 'solid',
                      borderColor: 'ink.border',
                      rounded: 'full',
                      fontSize: 'sm',
                      fontWeight: 'medium',
                      _hover: {
                        bg: 'paper.300',
                        borderColor: 'ink.borderStrong',
                      },
                      transition: 'colors',
                    })}
                  >
                    GitHub →
                  </a>
                  <a
                    href={AUTHOR_LINKEDIN}
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
                      borderWidth: 'hairline',
                      borderStyle: 'solid',
                      borderColor: 'ink.border',
                      rounded: 'full',
                      fontSize: 'sm',
                      fontWeight: 'medium',
                      _hover: {
                        bg: 'paper.300',
                        borderColor: 'ink.borderStrong',
                      },
                      transition: 'colors',
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
                    borderTopWidth: 'hairline',
                    borderColor: 'ink.border',
                  })}
                >
                  {stats.map(stat => (
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
                {/* 아래 링크들의 slug는 리터럴이라 인코딩이 필요 없지만,
                    postPath를 거치면 후행 슬래시 표기가 저절로 통일된다 —
                    예전엔 이 페이지의 글 링크 중 한 곳만 슬래시가 없었다. */}
                <Link
                  href={postPath('2025-retrospect')}
                  className={css({
                    fontFamily: 'mono',
                    fontSize: 'xs',
                    color: 'ink.500',
                    letterSpacing: 'monoXl',
                    _hover: { color: 'ink.950' },
                    transition: 'colors',
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
                railColumn({ width: 'wide' }),
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
                    borderBottomWidth: 'hairline',
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
                      link: postPath('ai-opensource-contribution'),
                    },
                    {
                      project: 'Mantine',
                      org: 'Community',
                      description:
                        '27개 PR 병합. 컴포넌트 버그 수정 및 기능 개선.',
                      link: postPath('first-open-source-contribution'),
                    },
                    {
                      project: 'Node.js',
                      org: 'OpenJS Foundation',
                      description:
                        'util.inspect의 numeric separator 포매팅 버그 수정.',
                      link: postPath('nodejs-contribution'),
                    },
                    {
                      project: 'Next.js',
                      org: 'Vercel',
                      description: 'Next.js 코어 기여.',
                      link: postPath('nextjs-contributor'),
                    },
                  ].map(item => (
                    <Link
                      key={item.project}
                      href={item.link}
                      className={css(hoverRow, {
                        display: 'block',
                        py: '5',
                        borderBottomWidth: 'hairline',
                        borderColor: 'ink.border',
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
                      borderBottomWidth: 'hairline',
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
                        link: postPath('feconf-2025-lightning-speaker'),
                      },
                      {
                        event: 'TeoConf',
                        description: '개발자 컨퍼런스 발표',
                        link: postPath('2025-teoconf-presentation'),
                      },
                    ].map(item => (
                      <Link
                        key={item.event}
                        href={item.link}
                        className={css(hoverRow, {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '4',
                          py: '4',
                          borderBottomWidth: 'hairline',
                          borderColor: 'ink.border',
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
                      borderBottomWidth: 'hairline',
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
                        href={archivePath({ series: series.id })}
                        className={css(hoverRow, {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          gap: '4',
                          py: '4',
                          borderBottomWidth: 'hairline',
                          borderColor: 'ink.border',
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
                        {seriesPostCounts.has(series.id) && (
                          <span
                            className={css({
                              fontFamily: 'mono',
                              fontSize: '2xs',
                              color: 'accent.solid',
                              letterSpacing: 'monoXl',
                              textTransform: 'uppercase',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                              pt: '0.5',
                            })}
                          >
                            {seriesPostCounts.get(series.id)}편
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
