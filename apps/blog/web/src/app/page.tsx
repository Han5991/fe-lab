import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import { getAllPosts } from '@/lib/posts';
import { TopPosts } from '@/src/components/home/TopPosts';
import { PostCard } from '@/src/components/home/PostCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frontend Lab | 프론트엔드 실험실',
  description:
    '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.',
  openGraph: {
    title: 'Frontend Lab | 프론트엔드 실험실',
    description:
      '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.',
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
    description:
      '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.',
    images: ['https://blog.sangwook.dev/og-default.png'],
  },
};

export default function HomePage() {
  const allPosts = getAllPosts();
  const recentPosts = allPosts.slice(0, 3);

  return (
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
            flexDirection: 'column',
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

            <div className={css({ display: 'flex', gap: '4', justifyContent: 'center' })}>
              <Link
                href="/posts"
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
        <TopPosts posts={allPosts} />

        {/* Recent Posts Section */}
        <section className={css({ py: '20', px: '6', maxWidth: '7xl', mx: 'auto', borderTopWidth: '1px', borderColor: 'gray.100' })}>
          <h2 className={css({ fontSize: '3xl', fontWeight: 'bold', mb: '10', textAlign: 'center' })}>
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
              href="/posts"
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
  );
}
