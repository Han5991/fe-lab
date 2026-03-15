import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import type { Metadata } from 'next';
import { SITE_URL, SITE_AUTHOR_GITHUB, SITE_AUTHOR_LINKEDIN } from '@/lib/constants';

export const metadata: Metadata = {
  title: '소개 | Frontend Lab',
  description:
    '프론트엔드 엔지니어 한상욱(Sangwook Han)의 소개 페이지. Mantine, Node.js, Next.js, gemini-cli 오픈소스 기여자. FEConf 2025 발표자.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: '소개 | Frontend Lab',
    description:
      '프론트엔드 엔지니어 한상욱(Sangwook Han). Mantine 27 PRs, Node.js 코어 기여, gemini-cli 74% 성능 개선. FEConf 2025 발표자.',
    url: `${SITE_URL}/about`,
    siteName: 'Frontend Lab',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  '@id': `${SITE_URL}/about`,
  url: `${SITE_URL}/about`,
  name: '한상욱 (Sangwook Han) — About',
  mainEntity: {
    '@type': 'Person',
    '@id': `${SITE_URL}/#author`,
    name: 'Sangwook Han',
    alternateName: '한상욱',
    url: SITE_URL,
    jobTitle: 'Frontend Engineer',
    description:
      '번들러 내부 구조, TypeScript 설계 패턴, 오픈소스 기여를 탐구하는 프론트엔드 엔지니어입니다.',
    sameAs: [
      SITE_AUTHOR_GITHUB,
      SITE_AUTHOR_LINKEDIN,
    ],
    knowsAbout: [
      'TypeScript',
      'React',
      'Next.js',
      'Bundlers',
      'Design Patterns',
      'Open Source Contribution',
      'Frontend Architecture',
    ],
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
        <div className={css({ minHeight: 'calc(100lvh - 231px)', bg: 'white' })}>
          <div
            className={css({
              maxW: '800px',
              mx: 'auto',
              px: '6',
              py: '16',
            })}
          >
            {/* 헤더 */}
            <div className={css({ mb: '12' })}>
              <h1
                className={css({
                  fontSize: { base: '4xl', md: '5xl' },
                  fontWeight: 'extrabold',
                  letterSpacing: 'tight',
                  mb: '4',
                  color: 'gray.900',
                })}
              >
                한상욱
                <span
                  className={css({
                    display: 'block',
                    fontSize: { base: 'xl', md: '2xl' },
                    fontWeight: 'medium',
                    color: 'gray.500',
                    mt: '1',
                  })}
                >
                  Sangwook Han · Frontend Engineer
                </span>
              </h1>
              <p
                className={css({
                  fontSize: 'lg',
                  color: 'gray.600',
                  lineHeight: 'relaxed',
                  maxW: '600px',
                })}
              >
                번들러 내부 구조, TypeScript 설계 패턴, 오픈소스 기여를 탐구합니다.
                직접 실험하고 기록하며 배운 것들을 이 블로그에 남깁니다.
              </p>

              {/* 링크 */}
              <div
                className={css({
                  display: 'flex',
                  gap: '3',
                  mt: '6',
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
                    px: '4',
                    py: '2',
                    rounded: 'lg',
                    bg: 'gray.900',
                    color: 'white',
                    fontSize: 'sm',
                    fontWeight: 'medium',
                    _hover: { bg: 'gray.700' },
                    transition: 'background 0.2s',
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
                    gap: '2',
                    px: '4',
                    py: '2',
                    rounded: 'lg',
                    bg: 'blue.600',
                    color: 'white',
                    fontSize: 'sm',
                    fontWeight: 'medium',
                    _hover: { bg: 'blue.700' },
                    transition: 'background 0.2s',
                  })}
                >
                  LinkedIn
                </a>
              </div>
            </div>

            {/* 오픈소스 기여 */}
            <section className={css({ mb: '12' })}>
              <h2
                className={css({
                  fontSize: '2xl',
                  fontWeight: 'bold',
                  mb: '6',
                  color: 'gray.900',
                  borderBottomWidth: '1px',
                  borderColor: 'gray.100',
                  pb: '3',
                })}
              >
                오픈소스 기여
              </h2>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
                {[
                  {
                    project: 'gemini-cli',
                    org: 'Google',
                    description:
                      'Promise.allSettled 병렬 처리로 성능 74% 개선 (408ms → 107ms). 구글 개발자로부터 "clean and thorough implementation" 코멘트 수령.',
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
                    description:
                      'util.inspect의 숫자 구분자(numeric separator) 포매팅 버그 수정.',
                    link: '/posts/nodejs-contribution',
                  },
                  {
                    project: 'Next.js',
                    org: 'Vercel',
                    description: 'Next.js 코어 기여.',
                    link: '/posts/nextjs-contributor',
                  },
                ].map(item => (
                  <div
                    key={item.project}
                    className={css({
                      p: '5',
                      rounded: 'xl',
                      borderWidth: '1px',
                      borderColor: 'gray.100',
                      _hover: { borderColor: 'blue.200', bg: 'blue.50/30' },
                      transition: 'all 0.2s',
                    })}
                  >
                    <div
                      className={css({
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '2',
                        mb: '2',
                      })}
                    >
                      <span
                        className={css({
                          fontWeight: 'bold',
                          fontSize: 'lg',
                          color: 'gray.900',
                        })}
                      >
                        {item.project}
                      </span>
                      <span className={css({ fontSize: 'sm', color: 'gray.400' })}>
                        {item.org}
                      </span>
                    </div>
                    <p className={css({ fontSize: 'sm', color: 'gray.600', lineHeight: 'relaxed', mb: '3' })}>
                      {item.description}
                    </p>
                    <Link
                      href={item.link}
                      className={css({
                        fontSize: 'sm',
                        color: 'blue.600',
                        _hover: { color: 'blue.800' },
                      })}
                    >
                      자세히 읽기 →
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* 발표 */}
            <section className={css({ mb: '12' })}>
              <h2
                className={css({
                  fontSize: '2xl',
                  fontWeight: 'bold',
                  mb: '6',
                  color: 'gray.900',
                  borderBottomWidth: '1px',
                  borderColor: 'gray.100',
                  pb: '3',
                })}
              >
                발표
              </h2>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                {[
                  {
                    event: 'FEConf 2025',
                    description: '한국 최대 프론트엔드 컨퍼런스 라이트닝 토크 발표',
                    link: '/posts/feconf-2025-lightning-speaker',
                  },
                  {
                    event: 'TeoConf',
                    description: '개발자 컨퍼런스 발표',
                    link: '/posts/2025-teoconf-presentation',
                  },
                ].map(item => (
                  <div
                    key={item.event}
                    className={css({
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: '3',
                      borderBottomWidth: '1px',
                      borderColor: 'gray.50',
                    })}
                  >
                    <div>
                      <span className={css({ fontWeight: 'semibold', color: 'gray.900', mr: '2' })}>
                        {item.event}
                      </span>
                      <span className={css({ fontSize: 'sm', color: 'gray.500' })}>
                        {item.description}
                      </span>
                    </div>
                    {item.link && (
                      <Link
                        href={item.link}
                        className={css({ fontSize: 'sm', color: 'blue.600', _hover: { color: 'blue.800' }, flexShrink: 0, ml: '4' })}
                      >
                        후기 →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 주요 시리즈 */}
            <section className={css({ mb: '12' })}>
              <h2
                className={css({
                  fontSize: '2xl',
                  fontWeight: 'bold',
                  mb: '6',
                  color: 'gray.900',
                  borderBottomWidth: '1px',
                  borderColor: 'gray.100',
                  pb: '3',
                })}
              >
                주요 시리즈
              </h2>
              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)' },
                  gap: '4',
                })}
              >
                {[
                  {
                    title: '번들러 만들기',
                    description: '모듈 번들러를 밑바닥부터 직접 구현. AST 파싱, 의존성 그래프, 스코프 격리, 소스맵까지.',
                    href: '/posts?tab=series&series=bundler',
                    count: '5편',
                  },
                  {
                    title: 'TypeScript로 설계하는 프로젝트',
                    description: '타입을 설계 도구로 활용하는 방법. API, 서비스, 도메인 레이어 전반의 타입 시스템 설계.',
                    href: '/posts?tab=series&series=typescript-project',
                    count: '7편',
                  },
                  {
                    title: '오픈소스 기여',
                    description: 'Mantine, Node.js, Next.js, gemini-cli 기여 경험과 노하우.',
                    href: '/posts?tab=series',
                    count: '4편',
                  },
                  {
                    title: '에러 핸들링',
                    description: 'JavaScript, React, Next.js 에러 처리 전략과 패턴.',
                    href: '/posts?tab=series',
                    count: '3편',
                  },
                ].map(series => (
                  <Link
                    key={series.title}
                    href={series.href}
                    className={css({
                      p: '5',
                      rounded: 'xl',
                      borderWidth: '1px',
                      borderColor: 'gray.100',
                      _hover: { borderColor: 'blue.200', bg: 'blue.50/30' },
                      transition: 'all 0.2s',
                      display: 'block',
                    })}
                  >
                    <div className={css({ display: 'flex', justifyContent: 'space-between', mb: '2' })}>
                      <span className={css({ fontWeight: 'bold', color: 'gray.900' })}>{series.title}</span>
                      <span className={css({ fontSize: 'xs', color: 'blue.600', bg: 'blue.50', px: '2', py: '0.5', rounded: 'full' })}>
                        {series.count}
                      </span>
                    </div>
                    <p className={css({ fontSize: 'sm', color: 'gray.500', lineHeight: 'relaxed' })}>
                      {series.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* 2025 회고 요약 */}
            <section
              className={css({
                p: '6',
                rounded: 'xl',
                bg: 'gray.50',
                borderWidth: '1px',
                borderColor: 'gray.100',
              })}
            >
              <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '4', color: 'gray.900' })}>
                2025년 활동 요약
              </h2>
              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '4',
                  textAlign: 'center',
                  mb: '4',
                })}
              >
                {[
                  { value: '33', label: '블로그 포스트' },
                  { value: '38', label: 'PR 승인' },
                  { value: '3', label: '컨퍼런스 발표' },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className={css({ fontSize: '3xl', fontWeight: 'extrabold', color: 'blue.600' })}>
                      {stat.value}
                    </div>
                    <div className={css({ fontSize: 'sm', color: 'gray.500' })}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <Link
                href="/posts/2025-retrospect"
                className={css({ fontSize: 'sm', color: 'blue.600', _hover: { color: 'blue.800' } })}
              >
                2025 회고 전체 읽기 →
              </Link>
            </section>
          </div>
        </div>
      </SsgoiTransition>
    </>
  );
}
