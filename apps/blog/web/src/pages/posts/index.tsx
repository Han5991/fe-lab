import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { getAllPosts, PostData } from '@/lib/posts';
import { css } from '@design-system/ui-lib/css';

interface PostsPageProps {
  posts: PostData[];
}

export default function PostsPage({ posts }: PostsPageProps) {
  return (
    <>
      <Head>
        <title>Posts | Frontend Lab</title>
        <meta
          name="description"
          content="프론트엔드 실험실의 모든 기록들을 확인해보세요."
        />
      </Head>

      <div className={css({ maxWidth: '800px', margin: '0 auto', px: '6', py: '16' })}>
        <header className={css({ mb: '12' })}>
          <h1
            className={css({
              fontSize: '4xl',
              fontWeight: 'bold',
              letterSpacing: 'tight',
              color: 'gray.900',
            })}
          >
            실험 기록들
          </h1>
          <p className={css({ color: 'gray.600', mt: '2' })}>
            총 {posts.length}개의 기록이 있습니다.
          </p>
        </header>

        <div className={css({ display: 'flex', flexDirection: 'column', gap: '8' })}>
          {posts.map(post => (
            <article key={post.slug} className="group">
              <Link href={`/posts/${post.slug}`} className={css({ display: 'block' })}>
                <div className={css({ mb: '2' })}>
                  {post.date && (
                    <time
                      dateTime={post.date}
                      className={css({ fontSize: 'sm', color: 'gray.400' })}
                    >
                      {new Date(post.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  )}
                </div>
                <h2
                  className={css({
                    fontSize: '2xl',
                    fontWeight: 'bold',
                    color: 'gray.900',
                    mb: '3',
                    transition: 'color 0.2s',
                    _groupHover: { color: 'blue.600' },
                  })}
                >
                  {post.title}
                </h2>
                <p
                  className={css({
                    color: 'gray.600',
                    lineHeight: 'relaxed',
                    mb: '4',
                    lineClamp: 3,
                    overflow: 'hidden',
                  })}
                >
                  {post.excerpt}
                </p>
                <div
                  className={css({
                    fontSize: 'sm',
                    fontWeight: 'semibold',
                    color: 'blue.600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1',
                  })}
                >
                  더 읽어보기
                  <span
                    className={css({
                      transition: 'transform 0.2s',
                      _groupHover: { transform: 'translateX(4px)' },
                    })}
                  >
                    →
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const posts = getAllPosts();

  return {
    props: {
      posts,
    },
  };
};
