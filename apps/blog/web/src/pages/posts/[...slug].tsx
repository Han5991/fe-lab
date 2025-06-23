import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  getAllPostSlugs,
  getPostBySlug,
  type PostData,
} from '../../../lib/posts';
import { incrementViewCount, getViewCount } from '../../../lib/analytics';

interface PostPageProps {
  post: PostData;
}

export default function PostPage({ post }: PostPageProps) {
  const [viewCount, setViewCount] = useState<number>(0);

  useEffect(() => {
    // 조회수 증가 및 현재 조회수 가져오기
    const handleViewCount = async () => {
      try {
        const newViewCount = await incrementViewCount(post.slug);
        setViewCount(newViewCount);
      } catch (error) {
        console.error('Failed to update view count:', error);
        // 실패해도 기존 조회수라도 가져오기 시도
        try {
          const currentViewCount = await getViewCount(post.slug);
          setViewCount(currentViewCount);
        } catch (fallbackError) {
          console.error('Failed to get view count:', fallbackError);
        }
      }
    };

    handleViewCount();
  }, [post.slug]);

  return (
    <>
      <Head>
        <title>{post.title} | Frontend Lab Blog</title>
        <meta name="description" content={post.excerpt || post.content.slice(0, 160) + '...'} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || post.content.slice(0, 160) + '...'} />
        <meta property="og:type" content="article" />
        {post.date && <meta property="article:published_time" content={post.date} />}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt || post.content.slice(0, 160) + '...'} />
      </Head>
      
      <article style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
          }}
        >
          {post.title}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: '#666', fontSize: '1rem', marginBottom: '1rem' }}>
          {post.date && (
            <span>
              {new Date(post.date).toLocaleDateString('ko-KR')}
            </span>
          )}
          <span>
            조회수 {viewCount.toLocaleString()}회
          </span>
        </div>
      </header>

      <div style={{ lineHeight: '1.8', fontSize: '1.1rem' }}>
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  margin: '2rem 0 1rem 0',
                }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  margin: '1.5rem 0 1rem 0',
                }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  margin: '1.25rem 0 0.75rem 0',
                }}
              >
                {children}
              </h3>
            ),
            p: ({ children }) => <p style={{ margin: '1rem 0' }}>{children}</p>,
            code: ({ children, className }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code
                    style={{
                      backgroundColor: '#f5f5f5',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                    }}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <pre
                  style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '8px',
                    overflow: 'auto',
                    fontSize: '0.9em',
                  }}
                >
                  <code>{children}</code>
                </pre>
              );
            },
            blockquote: ({ children }) => (
              <blockquote
                style={{
                  borderLeft: '4px solid #ddd',
                  paddingLeft: '1rem',
                  margin: '1rem 0',
                  color: '#666',
                  fontStyle: 'italic',
                }}
              >
                {children}
              </blockquote>
            ),
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>

      <footer
        style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e5e5e5',
        }}
      >
        <Link href="/posts" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← 목록으로 돌아가기
        </Link>
      </footer>
      </article>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllPostSlugs();

  const paths = slugs.map(slug => ({
    params: { slug: slug.split('/') },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = Array.isArray(params?.slug)
    ? params.slug.join('/')
    : params?.slug || '';
  const post = getPostBySlug(slug);

  if (!post) {
    return { notFound: true };
  }

  return {
    props: {
      post,
    },
  };
};
