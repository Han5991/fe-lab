import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import type { Metadata } from 'next';
import { SITE_URL, SITE_AUTHOR_GITHUB, SITE_AUTHOR_LINKEDIN } from '@/lib/constants';

export const metadata: Metadata = {
  title: '소개 | Frontend Lab',
  description:
    '프론트엔드 엔지니어 한상욱(Sangwook Han)의 소개 페이지. Mantine, Node.js, Next.js, gemini-cli 오픈소스 기여자. FEConf 2025 발표자.',
  alternates: { canonical: '/about/' },
  openGraph: {
    title: '소개 | Frontend Lab',
    description:
      '프론트엔드 엔지니어 한상욱(Sangwook Han). Mantine 27 PRs, Node.js 코어 기여, gemini-cli 74% 성능 개선. FEConf 2025 발표자.',
    url: `${SITE_URL}/about/`,
    siteName: 'Frontend Lab',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  '@id': `${SITE_URL}/about/`,
  url: `${SITE_URL}/about/`,
  name: '한상욱 (Sangwook Han) — About',
  dateCreated: '2024-12-01',
  dateModified: new Date().toISOString().split('T')[0],
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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SsgoiTransition id="/about">
        <div className={css({ bg: 'ink.25' })}>

          {/* Header */}
          <div
            className={css({
              borderBottomWidth: '1px',
              borderColor: 'ink.border',
              bg: 'ink.50',
            })}
          >
            <div
              className={css({
                maxW: '1200px',
                mx: 'auto',
                px: '6',
                py: { base: '14', md: '20' },
                display: 'grid',
                gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
                gap: '12',
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
                    mb: '4',
                    borderLeftWidth: '3px',
                    borderLeftColor: 'accent.600',
                    pl: '3',
                  })}
                >
                  Frontend Engineer
                </p>
                <h1
                  className={css({
                    fontSize: { base: '4xl', md: '5xl' },
                    fontWeight: 'extrabold',
                    letterSpacing: 'tight',
                    lineHeight: '1.1',
                    mb: '4',
                    color: 'ink.950',
                  })}
                >
                  한상욱
                  <span
                    className={css({
                      display: 'block',
                      fontSize: { base: 'xl', md: '2xl' },
                      fontWeight: 'medium',
                      color: 'ink.700',
                      mt: '1',
                      letterSpacing: 'normal',
                    })}
                  >
                    Sangwook Han
                  </span>
                </h1>
                <p
                  className={css({
                    fontSize: 'base',
                    color: 'ink.700',
                    lineHeight: '1.7',
                    maxW: '480px',
                  })}
                >
                  번들러 내부 구조, TypeScript 설계 패턴, 오픈소스 기여를 탐구합니다.
                  직접 실험하고 기록하며 배운 것들을 이 블로그에 남깁니다.
                </p>
              </div>

              <div
                className={css({
                  display: 'flex',
                  flexDir: 'column',
                  gap: '4',
                  alignSelf: 'start',
                  pt: { md: '8' },
                })}
              >
                <div className={css({ display: 'flex', gap: '3', flexWrap: 'wrap' })}>
                  <a
                    href={SITE_AUTHOR_GITHUB}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css({
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: '4',
                      py: '2',
                      rounded: 'lg',
                      bg: 'ink.950',
                      color: 'ink.25',
                      fontSize: 'sm',
                      fontWeight: 'medium',
                      _hover: { opacity: '0.85' },
                      transition: 'opacity 0.15s',
                    })}
                  >
                    GitHub
                  </a>
                  <a
                    href={SITE_AUTHOR_LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css({
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: '4',
                      py: '2',
                      rounded: 'lg',
                      bg: 'accent.600',
                      color: 'white',
                      fontSize: 'sm',
                      fontWeight: 'medium',
                      _hover: { opacity: '0.85' },
                      transition: 'opacity 0.15s',
                    })}
                  >
                    LinkedIn
                  </a>
                </div>

                {/* Stats */}
                <div
                  className={css({
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '4',
                    mt: '4',
                    pt: '6',
                    borderTopWidth: '1px',
                    borderColor: 'ink.border',
                  })}
                >
                  {[
                    { value: '33', label: '블로그 포스트' },
                    { value: '38', label: 'PR 승인' },
                    { value: '3', label: '컨퍼런스' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div
                        className={css({
                          fontSize: { base: '3xl', md: '4xl' },
                          fontWeight: 'extrabold',
                          color: 'ink.950',
                          letterSpacing: 'tight',
                          lineHeight: '1',
                        })}
                      >
                        {stat.value}
                      </div>
                      <div
                        className={css({
                          fontSize: 'xs',
                          color: 'ink.500',
                          mt: '0.5',
                        })}
                      >
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/posts/2025-retrospect"
                  className={css({
                    fontSize: 'xs',
                    color: 'ink.500',
                    _hover: { color: 'accent.600' },
                    transition: 'color 0.15s',
                  })}
                >
                  2025 회고 전체 읽기 →
                </Link>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className={css({
              maxW: '1200px',
              mx: 'auto',
              px: '6',
              py: { base: '12', md: '20' },
              display: 'grid',
              gridTemplateColumns: { base: '1fr', lg: '1fr 1fr' },
              gap: { base: '12', lg: '16' },
            })}
          >
            {/* 오픈소스 기여 */}
            <section>
              <p
                className={css({
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  letterSpacing: 'widest',
                  textTransform: 'uppercase',
                  color: 'accent.600',
                  mb: '3',
                })}
              >
                Open Source
              </p>
              <h2
                className={css({
                  fontSize: { base: 'xl', md: '2xl' },
                  fontWeight: 'bold',
                  color: 'ink.950',
                  letterSpacing: 'tight',
                  mb: '6',
                })}
              >
                오픈소스 기여
              </h2>
              <div
                className={css({
                  borderTopWidth: '1px',
                  borderColor: 'ink.border',
                })}
              >
                {[
                  {
                    project: 'gemini-cli',
                    org: 'Google',
                    description: 'Promise.allSettled 병렬 처리로 성능 74% 개선 (408ms → 107ms).',
                    link: '/posts/ai-opensource-contribution',
                  },
                  {
                    project: 'Mantine',
                    org: 'Community',
                    description: '27개 PR 병합. 컴포넌트 버그 수정 및 기능 개선.',
                    link: '/posts/first-open-source-contribution',
                  },
                  {
                    project: 'Node.js',
                    org: 'OpenJS Foundation',
                    description: 'util.inspect의 numeric separator 포매팅 버그 수정.',
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
                      borderBottomWidth: '1px',
                      borderColor: 'ink.border',
                      transition: 'background 0.15s',
                      _hover: { bg: 'ink.50', mx: '-6', px: '6' },
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
                          fontWeight: 'bold',
                          fontSize: 'base',
                          color: 'ink.950',
                        })}
                      >
                        {item.project}
                      </span>
                      <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                        {item.org}
                      </span>
                    </div>
                    <p
                      className={css({
                        fontSize: 'sm',
                        color: 'ink.700',
                        lineHeight: '1.6',
                      })}
                    >
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <div className={css({ display: 'flex', flexDir: 'column', gap: '12' })}>
              {/* 발표 */}
              <section>
                <p
                  className={css({
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    letterSpacing: 'widest',
                    textTransform: 'uppercase',
                    color: 'accent.600',
                    mb: '3',
                  })}
                >
                  Speaking
                </p>
                <h2
                  className={css({
                    fontSize: { base: 'xl', md: '2xl' },
                    fontWeight: 'bold',
                    color: 'ink.950',
                    letterSpacing: 'tight',
                    mb: '6',
                  })}
                >
                  발표
                </h2>
                <div
                  className={css({
                    borderTopWidth: '1px',
                    borderColor: 'ink.border',
                  })}
                >
                  {[
                    {
                      event: 'FEConf 2025',
                      description: '한국 최대 프론트엔드 컨퍼런스 라이트닝 토크',
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
                        borderBottomWidth: '1px',
                        borderColor: 'ink.border',
                        transition: 'background 0.15s, box-shadow 0.15s',
                        _hover: { bg: 'ink.50', mx: '-6', px: '6', boxShadow: 'accentLeft' },
                      })}
                    >
                      <div>
                        <span
                          className={css({
                            fontWeight: 'semibold',
                            color: 'ink.950',
                            fontSize: 'sm',
                            display: 'block',
                            mb: '0.5',
                          })}
                        >
                          {item.event}
                        </span>
                        <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                          {item.description}
                        </span>
                      </div>
                      <span className={css({ fontSize: 'sm', color: 'ink.500', flexShrink: 0 })}>
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {/* 주요 시리즈 */}
              <section>
                <p
                  className={css({
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    letterSpacing: 'widest',
                    textTransform: 'uppercase',
                    color: 'accent.600',
                    mb: '3',
                  })}
                >
                  Series
                </p>
                <h2
                  className={css({
                    fontSize: { base: 'xl', md: '2xl' },
                    fontWeight: 'bold',
                    color: 'ink.950',
                    letterSpacing: 'tight',
                    mb: '6',
                  })}
                >
                  주요 시리즈
                </h2>
                <div
                  className={css({
                    display: 'flex',
                    flexDir: 'column',
                    borderTopWidth: '1px',
                    borderColor: 'ink.border',
                  })}
                >
                  {[
                    {
                      title: '번들러 만들기',
                      description: '모듈 번들러를 밑바닥부터 직접 구현. AST 파싱, 의존성 그래프, 스코프 격리, 소스맵까지.',
                      href: '/posts?tab=series&series=bundler&q=bundler',
                      count: '5편',
                    },
                    {
                      title: 'TypeScript로 설계하는 프로젝트',
                      description: '타입을 설계 도구로 활용하는 방법. API, 서비스, 도메인 레이어 전반의 타입 시스템 설계.',
                      href: '/posts?tab=series&series=typescript&q=typescript',
                      count: '7편',
                    },
                    {
                      title: '오픈소스 기여',
                      description: 'Mantine, Node.js, Next.js, gemini-cli 기여 경험과 노하우.',
                      href: '/posts?tab=series&series=open-source&q=open-source',
                      count: '4편',
                    },
                    {
                      title: '에러 핸들링',
                      description: 'JavaScript, React, Next.js 에러 처리 전략과 패턴.',
                      href: '/posts?tab=series&series=에러&q=에러',
                      count: '3편',
                    },
                  ].map(series => (
                    <Link
                      key={series.title}
                      href={series.href}
                      className={css({
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        gap: '4',
                        py: '4',
                        borderBottomWidth: '1px',
                        borderColor: 'ink.border',
                        transition: 'background 0.15s, box-shadow 0.15s',
                        _hover: { bg: 'ink.50', mx: '-6', px: '6', boxShadow: 'accentLeft' },
                      })}
                    >
                      <div className={css({ flex: 1, minW: 0 })}>
                        <span
                          className={css({
                            fontWeight: 'semibold',
                            color: 'ink.950',
                            fontSize: 'sm',
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
                            lineHeight: '1.6',
                          })}
                        >
                          {series.description}
                        </p>
                      </div>
                      <span
                        className={css({
                          fontSize: 'xs',
                          color: 'accent.600',
                          bg: 'accent.50',
                          px: '2',
                          py: '0.5',
                          rounded: 'sm',
                          fontWeight: 'medium',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        })}
                      >
                        {series.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </SsgoiTransition>
    </>
  );
}
