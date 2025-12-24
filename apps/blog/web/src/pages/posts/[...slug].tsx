import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getAllPostSlugs, getPostBySlug, type PostData } from '@/lib/posts';
import { css, cx } from '@design-system/ui-lib/css';

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
            lineHeight: 'relaxed',
            color: 'gray.800',
            // Premium Typography Styles
            '& h1': { fontSize: '3xl', fontWeight: 'bold', mt: '14', mb: '6', color: 'gray.900', letterSpacing: 'tight' },
            '& h2': { fontSize: '2xl', fontWeight: 'bold', mt: '12', mb: '5', color: 'gray.900', letterSpacing: 'tight', borderBottomWidth: '1px', pb: '2', borderColor: 'gray.100' },
            '& h3': { fontSize: 'xl', fontWeight: 'bold', mt: '10', mb: '4', color: 'gray.900' },
            '& p': { mb: '6', wordBreak: 'keep-all' },
            '& ul': { listStyleType: 'disc', pl: '6', mb: '6' },
            '& ol': { listStyleType: 'decimal', pl: '6', mb: '6' },
            '& li': { mb: '3', pl: '1' },
            '& li > ul': { mt: '2', mb: '0' },
            '& code:not([class])': { // Inline code
              bg: 'gray.50',
              px: '1.5',
              py: '0.5',
              borderRadius: 'md',
              fontSize: '0.85em',
              color: 'blue.600',
              fontWeight: '600',
              fontFamily: 'mono',
              borderWidth: '1px',
              borderColor: 'gray.200/50',
            },
            '& blockquote': {
              borderLeftWidth: '4px',
              borderLeftColor: 'blue.200',
              pl: '6',
              py: '2',
              my: '8',
              fontStyle: 'italic',
              color: 'gray.600',
              bg: 'blue.50/30',
              roundedRight: 'md',
            },
            '& a': {
              color: 'blue.600',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
              transition: 'all 0.2s',
              fontWeight: '500',
              _hover: { color: 'blue.700', bg: 'blue.50', py: '0.5', px: '1', rounded: 'sm' },
            },
            '& img': {
              borderRadius: 'xl',
              my: '10',
              w: 'full',
              h: 'auto',
              shadow: 'md',
            },
            '& hr': {
              my: '16',
              borderColor: 'gray.100',
              borderStyle: 'solid',
            },
            '& table': {
              w: 'full',
              mb: '8',
              borderCollapse: 'collapse',
              fontSize: 'md',
            },
            '& th': {
              bg: 'gray.50',
              fontWeight: 'semibold',
              p: '3',
              borderWidth: '1px',
              borderColor: 'gray.200',
              textAlign: 'left',
            },
            '& td': {
              p: '3',
              borderWidth: '1px',
              borderColor: 'gray.100',
            },
          })}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const content = String(children).replace(/\n$/, '');
                return !inline && match ? (
                  <div className={css({ mb: '10', mt: '6', position: 'relative', shadow: '2xl', rounded: 'xl', overflow: 'hidden', borderWidth: '1px', borderColor: 'white/10' })}>
                    {/* macOS Window Controls */}
                    <div
                      className={css({
                        bg: '#282c34',
                        px: '4',
                        py: '3',
                        display: 'flex',
                        gap: '2.5',
                        alignItems: 'center',
                        borderBottomWidth: '1px',
                        borderColor: 'white/10',
                      })}
                    >
                      <div className={css({ boxSize: '3', rounded: 'full', bg: '#ff5f56', shadow: 'sm' })} />
                      <div className={css({ boxSize: '3', rounded: 'full', bg: '#ffbd2e', shadow: 'sm' })} />
                      <div className={css({ boxSize: '3', rounded: 'full', bg: '#27c93f', shadow: 'sm' })} />
                      {match[1] && (
                        <span
                          className={css({
                            ml: '4',
                            color: 'gray.500',
                            fontSize: 'xs',
                            fontFamily: 'mono',
                            textTransform: 'uppercase',
                            letterSpacing: 'wider',
                            fontWeight: 'bold',
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
                        fontSize: '0.9em',
                        lineHeight: '1.7',
                        background: '#282c34',
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
