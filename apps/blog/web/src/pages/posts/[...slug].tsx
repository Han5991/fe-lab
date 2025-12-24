import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getAllPostSlugs, getPostBySlug, type PostData } from '@/lib/posts';
import { css } from '@design-system/ui-lib/css';

interface PostPageProps {
  post: PostData;
}

const CopyButton = ({ content }: { content: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }, [content]);

  return (
    <button
      onClick={handleCopy}
      className={css({
        ml: '4',
        px: '2',
        py: '1',
        fontSize: 'xs',
        color: 'gray.500',
        bg: 'white/5',
        rounded: 'md',
        borderWidth: '1px',
        borderColor: 'white/10',
        cursor: 'pointer',
        transition: 'all 0.2s',
        _hover: { bg: 'white/10', color: 'gray.300', borderColor: 'white/20' },
      })}
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export default function PostPage({ post }: PostPageProps) {
  return (
    <>
      <Head>
        <title>{post.title} | Frontend Lab Blog</title>
        <meta
          name="description"
          content={post.excerpt || post.content.slice(0, 160) + '...'}
        />
        <meta property="og:title" content={post.title} />
        <meta
          property="og:description"
          content={post.excerpt || post.content.slice(0, 160) + '...'}
        />
        <meta property="og:type" content="article" />
        {post.date && (
          <meta property="article:published_time" content={post.date} />
        )}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={post.title} />
        <meta
          name="twitter:description"
          content={post.excerpt || post.content.slice(0, 160) + '...'}
        />
      </Head>

      <div className={css({ maxWidth: '800px', margin: '0 auto', px: '6', py: '12' })}>
        <header className={css({ mb: '10' })}>
          <h1
            className={css({
              fontSize: '4xl',
              fontWeight: 'bold',
              letterSpacing: 'tight',
              lineHeight: '1.2',
              mb: '4',
              color: 'gray.900',
            })}
          >
            {post.title}
          </h1>
          <div
            className={css({
              display: 'flex',
              gap: '3',
              alignItems: 'center',
              color: 'gray.500',
              fontSize: 'sm',
            })}
          >
            {post.date && (
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </div>
        </header>

        <div
          className={css({
            fontSize: 'lg',
            lineHeight: '1.8',
            color: 'gray.800',
            '& h1': { fontSize: '2xl', fontWeight: 'bold', mt: '12', mb: '6', color: 'gray.900' },
            '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: '10', mb: '5', color: 'gray.900' },
            '& h3': { fontSize: 'lg', fontWeight: 'bold', mt: '8', mb: '4', color: 'gray.900' },
            '& p': { mb: '6' },
            '& ul': { listStyleType: 'disc', pl: '6', mb: '6' },
            '& ol': { listStyleType: 'decimal', pl: '6', mb: '6' },
            '& li': { mb: '2', pl: '1' },
            '& code': {
              bg: 'gray.100',
              px: '2',
              py: '0.5',
              borderRadius: 'md',
              fontSize: '0.85em',
              color: 'blue.600', // Changed to blue for better contrast
              fontWeight: '500',
              fontFamily: 'var(--font-mono, monospace)',
            },
            '& blockquote': {
              borderLeftWidth: '4px',
              borderLeftColor: 'gray.200',
              pl: '6',
              py: '1',
              my: '8',
              fontStyle: 'italic',
              color: 'gray.600',
            },
            '& a': {
              color: 'blue.600',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
              transition: 'color 0.2s',
              _hover: { color: 'blue.800' },
            },
            '& img': {
              borderRadius: 'lg',
              my: '8',
              w: 'full',
              h: 'auto',
            },
            '& hr': {
              my: '12',
              borderColor: 'gray.200',
            },
          })}
        >
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const content = String(children).replace(/\n$/, '');
                return !inline && match ? (
                  <div className={css({ mb: '8', mt: '4', position: 'relative', shadow: 'xl', rounded: 'xl', overflow: 'hidden' })}>
                    {/* macOS Window Controls */}
                    <div
                      className={css({
                        bg: '#282c34', // Matched with One Dark
                        px: '4',
                        py: '2.5',
                        display: 'flex',
                        gap: '2.5',
                        alignItems: 'center',
                        borderBottomWidth: '1px',
                        borderColor: 'white/5',
                      })}
                    >
                      <div className={css({ boxSize: '3', rounded: 'full', bg: '#ff5f56' })} />
                      <div className={css({ boxSize: '3', rounded: 'full', bg: '#ffbd2e' })} />
                      <div className={css({ boxSize: '3', rounded: 'full', bg: '#27c93f' })} />
                      {match[1] && (
                        <span
                          className={css({
                            ml: '4',
                            color: 'gray.400',
                            fontSize: 'xs',
                            fontFamily: 'mono',
                            textTransform: 'lowercase',
                          })}
                        >
                          {match[1]}
                        </span>
                      )}
                      <div className={css({ ml: 'auto' })}>
                        <CopyButton content={content} />
                      </div>
                    </div>
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        padding: '1.5rem',
                        fontSize: '0.85em',
                        lineHeight: '1.6',
                      }}
                      {...props}
                    >
                      {content}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </div>
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
