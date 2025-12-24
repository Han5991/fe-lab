import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getAllPostSlugs, getPostBySlug, type PostData } from '@/lib/posts';
import { css, cx } from '@design-system/ui-lib/css';
import mermaid from 'mermaid';
import { SsgoiTransition } from "@ssgoi/react";

interface PostPageProps {
  post: PostData;
}

// Mermaid Initialization
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#1e40af',
      primaryBorderColor: '#93c5fd',
      lineColor: '#64748b',
      secondaryColor: '#f1f5f9',
      tertiaryColor: '#fff',
    },
    securityLevel: 'loose',
  });
}

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderChart = async () => {
      if (ref.current) {
        try {
          const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart);
          setSvg(svg);
        } catch (error) {
          console.error('Mermaid render failed:', error);
        }
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div
      ref={ref}
      className={css({
        my: '10',
        p: '6',
        bg: 'gray.50/50',
        rounded: '2xl',
        borderWidth: '1px',
        borderColor: 'gray.100',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
        transition: 'all 0.3s',
        _hover: { shadow: 'xl', transform: 'translateY(-2px)', bg: 'white' }
      })}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

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
        color: 'gray.400',
        bg: 'white/5',
        rounded: 'md',
        borderWidth: '1px',
        borderColor: 'white/10',
        cursor: 'pointer',
        transition: 'all 0.2s',
        _hover: { bg: 'white/10', color: 'blue.400', borderColor: 'blue.500/30' },
      })}
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export default function PostPage({ post }: PostPageProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <SsgoiTransition id={`/posts/${post.slug}`}>
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

      <div
        className={cx(
          css({
            maxWidth: '850px',
            margin: '0 auto',
            px: '6',
            py: '20',
            opacity: 0,
            transform: 'translateY(10px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }),
          isVisible && css({ opacity: 1, transform: 'translateY(0)' })
        )}
      >
        <header className={css({ mb: '16', textAlign: 'center' })}>
          <div className={css({
            display: 'inline-block',
            mb: '6',
            px: '3',
            py: '1',
            rounded: 'full',
            bg: 'blue.50',
            color: 'blue.600',
            fontSize: 'xs',
            fontWeight: 'bold',
            letterSpacing: 'wider',
            textTransform: 'uppercase'
          })}>
            Lab Log
          </div>
          <h1
            className={css({
              fontSize: { base: '4xl', md: '5xl' },
              fontWeight: 'extrabold',
              letterSpacing: 'tight',
              lineHeight: '1.2',
              mb: '6',
              color: 'gray.900',
            })}
          >
            {post.title}
          </h1>
          <div
            className={css({
              display: 'flex',
              gap: '4',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'gray.400',
              fontSize: 'sm',
              fontWeight: 'medium'
            })}
          >
            {post.date && (
              <time dateTime={post.date} className={css({ color: 'gray.500' })}>
                {new Date(post.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
            <span className={css({ w: '1', h: '1', rounded: 'full', bg: 'gray.300' })} />
            <span>{Math.ceil(post.content.length / 500)} min read</span>
          </div>
        </header>

        <div
          className={css({
            fontSize: '1.125rem',
            lineHeight: '1.8',
            color: 'gray.700',
            // Selection Style
            '& ::selection': { bg: 'blue.600', color: 'white' },
            // Premium Typography Styles
            '& h1': { fontSize: '3xl', fontWeight: '800', mt: '16', mb: '6', color: 'gray.900', letterSpacing: 'tight' },
            '& h2': {
              fontSize: '2xl',
              fontWeight: '700',
              mt: '14',
              mb: '6',
              color: 'gray.900',
              letterSpacing: 'tight',
              position: 'relative',
              display: 'inline-block',
              _after: {
                content: '""',
                position: 'absolute',
                bottom: '-2',
                left: '0',
                w: '8',
                h: '1',
                bg: 'blue.600',
                rounded: 'full'
              }
            },
            '& h3': { fontSize: 'xl', fontWeight: '700', mt: '12', mb: '4', color: 'gray.900' },
            '& p': { mb: '8', wordBreak: 'keep-all' },
            '& ul': { listStyleType: 'disc', pl: '6', mb: '8' },
            '& ol': { listStyleType: 'decimal', pl: '6', mb: '8' },
            '& li': { mb: '3', pl: '1' },
            '& li > ul': { mt: '2', mb: '0' },
            '& li.task-list-item': {
              listStyleType: 'none',
              pl: '0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '3',
              mb: '4'
            },
            '& li.task-list-item input[type="checkbox"]': {
              mt: '1.5',
              cursor: 'default',
              accentColor: '#2563eb',
              boxSize: '4',
            },
            '& del': {
              color: 'gray.400',
              textDecorationColor: 'gray.300',
            },
            '& code:not([class])': { // Inline code
              bg: 'blue.50/50',
              px: '1.5',
              py: '0.5',
              borderRadius: 'md',
              fontSize: '0.9em',
              color: 'blue.700',
              fontWeight: '600',
              fontFamily: 'mono',
              borderWidth: '1px',
              borderColor: 'blue.100/50',
            },
            '& blockquote': {
              borderLeftWidth: '4px',
              borderLeftColor: 'blue.600',
              pl: '8',
              py: '4',
              my: '10',
              color: 'gray.600',
              bg: 'blue.50/30',
              roundedRight: '2xl',
              fontSize: '1.15rem',
              fontStyle: 'italic',
              '& p': { mb: '0' },
            },
            '& a': {
              color: 'blue.600',
              textDecoration: 'none',
              borderBottomWidth: '1px',
              borderBottomColor: 'blue.200',
              transition: 'all 0.2s',
              fontWeight: '600',
              _hover: { color: 'blue.700', borderBottomColor: 'blue.600', bg: 'blue.50/50' },
            },
            '& img': {
              borderRadius: '2xl',
              my: '14',
              w: 'full',
              h: 'auto',
              shadow: '2xl',
              borderWidth: '1px',
              borderColor: 'gray.100'
            },
            '& hr': {
              my: '20',
              h: '1px',
              border: 'none',
              bgGradient: 'to-r',
              gradientFrom: 'transparent',
              gradientVia: 'gray.200',
              gradientTo: 'transparent',
            },
            '& table': {
              w: 'full',
              mb: '12',
              mt: '8',
              borderCollapse: 'separate',
              borderSpacing: '0',
              fontSize: 'md',
              borderWidth: '1px',
              borderColor: 'gray.200',
              borderRadius: '2xl',
              overflow: 'hidden',
              boxShadow: 'sm'
            },
            '& th': {
              bg: 'gray.50',
              fontWeight: 'bold',
              p: '5',
              borderBottomWidth: '1px',
              borderColor: 'gray.200',
              textAlign: 'left',
              color: 'gray.900',
            },
            '& td': {
              p: '5',
              borderBottomWidth: '1px',
              borderColor: 'gray.100',
              color: 'gray.700',
              transition: 'all 0.2s'
            },
            '& tr:last-child td': {
              borderBottomWidth: '0',
            },
            '& tr:nth-child(even)': {
              bg: 'gray.50/20',
            },
            '& tr:hover td': {
              bg: 'blue.50/10',
            },
          })}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const content = String(children).replace(/\n$/, '');

                // Mermaid Rendering
                if (!inline && match && match[1] === 'mermaid') {
                  return <Mermaid chart={content} />;
                }

                return !inline && match ? (
                  <div className={css({ mb: '12', mt: '8', position: 'relative', shadow: '2xl', rounded: '2xl', overflow: 'hidden', borderWidth: '1px', borderColor: 'white/10' })}>
                    {/* macOS Window Controls */}
                    <div
                      className={css({
                        bg: '#1e1e1e',
                        px: '5',
                        py: '4',
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
                            color: 'gray.500',
                            fontSize: 'xs',
                            fontFamily: 'mono',
                            textTransform: 'uppercase',
                            letterSpacing: 'widest',
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
                        padding: '2rem',
                        fontSize: '0.95em',
                        lineHeight: '1.8',
                        background: '#1e1e1e',
                      }}
                      {...props}
                    >
                      {content}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code
                    className={cx(
                      className,
                      !inline && css({
                        display: 'block',
                        p: '4',
                        bg: 'gray.900',
                        color: 'gray.100',
                        rounded: 'xl',
                        overflowX: 'auto',
                        fontFamily: 'mono',
                        fontSize: '0.9em',
                        my: '6'
                      })
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              img({ src, alt }: any) {
                // GitHub Pages 배포 시 basePath(/fe-lab) 대응
                const PREFIX = process.env.NODE_ENV === 'production' ? '/fe-lab' : '';

                // 상대 경로인 경우 (http로 시작하지 않는 경우) 경로 보정
                const isRelative = src && !src.startsWith('http') && !src.startsWith('/');
                const imageSrc = isRelative
                  ? `${PREFIX}/posts/${post.relativeDir}/${src}`
                  : src.startsWith('/') ? `${PREFIX}${src}` : src;

                return (
                  <figure className={css({ my: '14' })}>
                    <img
                      src={imageSrc}
                      alt={alt}
                      className={css({
                        borderRadius: '2xl',
                        w: 'full',
                        h: 'auto',
                        shadow: '2xl',
                        borderWidth: '1px',
                        borderColor: 'gray.100'
                      })}
                    />
                    {alt && (
                      <figcaption className={css({
                        mt: '4',
                        textAlign: 'center',
                        fontSize: 'sm',
                        color: 'gray.400',
                        fontStyle: 'italic'
                      })}>
                        {alt}
                      </figcaption>
                    )}
                  </figure>
                );
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </div>
    </SsgoiTransition>
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

