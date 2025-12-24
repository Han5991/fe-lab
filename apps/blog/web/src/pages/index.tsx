import Head from 'next/head';
import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Frontend Lab | 프론트엔드 실험실</title>
        <meta
          name="description"
          content="프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다."
        />
        <meta property="og:title" content="Frontend Lab" />
        <meta
          property="og:description"
          content="프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다."
        />
        <meta property="og:type" content="website" />
      </Head>

      <div
        className={css({
          minHeight: 'calc(100vh - 64px)', // Deducting nav height
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bg: 'white',
          px: '6',
          textAlign: 'center',
        })}
      >
        <main
          className={css({
            maxWidth: '2xl',
            w: 'full',
          })}
        >
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
    </>
  );
}
