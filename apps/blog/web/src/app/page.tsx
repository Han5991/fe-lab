import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import { getAllPosts, type PostData } from '@/lib/posts';
import { client } from '@/lib/client';

export const revalidate = 3600; // Revalidate every hour

async function getTopPosts() {
  const { data } = await client
    .from('post_views')
    .select('slug, view_count')
    .order('view_count', { ascending: false })
    .limit(3);

  // If no data or error, return empty array
  if (!data) return [];

  const allPosts = getAllPosts();

  // Map views to post data
  const topPosts = data
    .map(view => {
      const post = allPosts.find(p => p.slug === view.slug);
      if (!post) return null;
      return { ...post, viewCount: view.view_count };
    })
    .filter((post): post is PostData & { viewCount: number } => post !== null);

  return topPosts;
}

function PostCard({ post, rank }: { post: PostData; rank?: number }) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={css({
        display: 'flex',
        flexDirection: 'column',
        p: '6',
        bg: 'white',
        rounded: '2xl',
        borderWidth: '1px',
        borderColor: 'gray.100',
        transition: 'all 0.2s',
        _hover: {
          borderColor: 'blue.200',
          transform: 'translateY(-4px)',
          shadow: 'lg',
        },
      })}
    >
      <div className={css({ mb: '4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        {rank && (
          <span
            className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              w: '8',
              h: '8',
              rounded: 'full',
              bg: rank === 1 ? 'yellow.100' : rank === 2 ? 'gray.100' : 'orange.100',
              color: rank === 1 ? 'yellow.700' : rank === 2 ? 'gray.700' : 'orange.700',
              fontWeight: 'bold',
              fontSize: 'sm',
            })}
          >
            {rank}
          </span>
        )}
        {post.date && (
          <time className={css({ fontSize: 'sm', color: 'gray.400' })}>
            {new Date(post.date).toLocaleDateString()}
          </time>
        )}
      </div>
      <h3
        className={css({
          fontSize: 'xl',
          fontWeight: 'bold',
          color: 'gray.900',
          mb: '2',
          lineClamp: 2,
        })}
      >
        {post.title}
      </h3>
      <p
        className={css({
          color: 'gray.600',
          fontSize: 'sm',
          lineHeight: 'relaxed',
          lineClamp: 3,
          mb: '4',
          flex: 1,
        })}
      >
        {post.excerpt}
      </p>
      <div className={css({ display: 'flex', alignItems: 'center', color: 'blue.600', fontSize: 'sm', fontWeight: 'semibold' })}>
        Read more <span className={css({ ml: '1' })}>→</span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const topPosts = await getTopPosts();
  const recentPosts = getAllPosts().slice(0, 3);

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

        {/* Top Posts Section */}
        {topPosts.length > 0 && (
          <section className={css({ py: '20', px: '6', maxWidth: '7xl', mx: 'auto' })}>
            <h2 className={css({ fontSize: '3xl', fontWeight: 'bold', mb: '10', textAlign: 'center' })}>
              🔥 인기 있는 실험 기록
            </h2>
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', md: '3fr' },
                gap: '8',
              })}
            >
              {topPosts.map((post, index) => (
                <PostCard key={post.slug} post={post} rank={index + 1} />
              ))}
            </div>
          </section>
        )}

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
