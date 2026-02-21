'use client';

import { useState, useCallback, useEffect, Children } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { css, cx } from '@design-system/ui-lib/css';
import mermaid from 'mermaid';
import { SsgoiTransition } from '@ssgoi/react';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

import type { PostData } from '@/lib/posts';
import GiscusComments from '@/src/components/GiscusComments';
import { useViewCount } from '@/lib/hooks/useViewCount';
import { ReadingProgressBar } from '@/src/components/mobile/ReadingProgressBar';
import { BackToTop } from '@/src/components/mobile/BackToTop';
import { MobileTOC } from '@/src/components/mobile/MobileTOC';
import { ShareButton } from '@/src/components/mobile/ShareButton';
import { DesktopTOC } from '@/src/components/desktop/DesktopTOC';

// Mermaid Initialization
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: true,
    securityLevel: 'strict',
  });
}

const Mermaid = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render(
          `mermaid-${Math.random().toString(36).substr(2, 9)}`,
          chart,
        );
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid render failed:', error);
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div
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
        _hover: { shadow: 'xl', transform: 'translateY(-2px)', bg: 'white' },
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
        _hover: {
          bg: 'white/10',
          color: 'blue.400',
          borderColor: 'blue.500/30',
        },
      })}
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export default function PostClient({
  post,
  thumbnailUrl,
}: {
  post: PostData;
  thumbnailUrl?: string;
}) {
  useViewCount(post.slug);
  return (
    <>
      <ReadingProgressBar />
      <BackToTop />

      {/* Mobile only TOC */}
      <div className={css({ display: 'block', lg: { display: 'none' } })}>
        <MobileTOC />
      </div>

      <SsgoiTransition
        id={`/posts/${post.slug}`}
        className={css({
          maxW: 'screen-xl',
          m: '0 auto',
          px: '6',
          py: '20',
        })}
      >
        <div
          className={css({
            display: 'flex',
            gap: '8',
            justifyContent: 'center',
          })}
        >
          {/* Main Content Article */}
          <article className={css({ flex: 1, maxW: '850px', minW: 0 })}>
            <header className={css({ mb: '16', textAlign: 'center' })}>
              <div
                className={css({
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
                  textTransform: 'uppercase',
                })}
              >
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
                  fontWeight: 'medium',
                })}
              >
                {post.date && (
                  <time
                    dateTime={post.date}
                    className={css({ color: 'gray.500' })}
                  >
                    {new Date(post.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
                <span
                  className={css({
                    w: '1',
                    h: '1',
                    rounded: 'full',
                    bg: 'gray.300',
                  })}
                />
                <span>{Math.ceil(post.content.length / 500)} min read</span>
              </div>
            </header>

            {/* Thumbnail Hero Image */}
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={post.title}
                className={css({
                  mb: '12',
                  rounded: '2xl',
                  w: 'full',
                  h: 'auto',
                  shadow: '2xl',
                  borderWidth: '1px',
                  borderColor: 'gray.100',
                  display: 'block',
                })}
              />
            )}

            <div
              id="post-content"
              className={css({
                fontSize: '1.125rem',
                lineHeight: '1.8',
                color: 'gray.700',
                '& ::selection': { bg: 'blue.600', color: 'white' },
                '& h1': {
                  fontSize: '3xl',
                  fontWeight: '800',
                  mt: '16',
                  mb: '6',
                  color: 'gray.900',
                  letterSpacing: 'tight',
                  scrollMarginTop: '100px',
                },
                '& h2': {
                  fontSize: '2xl',
                  fontWeight: '700',
                  mt: 8,
                  mb: '6',
                  color: 'gray.900',
                  letterSpacing: 'tight',
                  pos: 'relative',
                  display: 'inline-block',
                  scrollMarginTop: '100px',
                  _after: {
                    content: '""',
                    pos: 'absolute',
                    bottom: '-2',
                    left: '0',
                    w: 'full',
                    h: '1',
                    bg: 'blue.600',
                    rounded: 'full',
                  },
                },
                '& h3': {
                  fontSize: 'xl',
                  fontWeight: '700',
                  mt: 8,
                  mb: '4',
                  color: 'gray.900',
                  scrollMarginTop: '100px',
                },
                '& h4': {
                  fontSize: 'lg',
                  fontWeight: '600',
                  mt: 6,
                  mb: '3',
                  color: 'gray.800',
                  scrollMarginTop: '100px',
                },
                '& p': { mb: '8' },
                '& ul': { listStyleType: 'disc', pl: '6', mb: '8' },
                '& ol': { listStyleType: 'decimal', pl: '6', mb: '8' },
                '& li': { mb: '1', pl: '1' },
                '& li > ul': { mt: '2', mb: '0' },
                '& li.task-list-item > div > ul': { mt: '2', mb: '0' },
                '& li.task-list-item': {
                  listStyleType: 'none',
                  pl: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '3',
                  mb: '4',
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
                '& code:not([class])': {
                  bg: 'gray.100',
                  px: '1.5',
                  py: '0.5',
                  rounded: 'md',
                  fontSize: '0.85em',
                  color: 'red.500',
                  fontWeight: '500',
                  borderWidth: '1px',
                  borderColor: 'gray.200',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                },
                '& blockquote': {
                  borderLeftWidth: '4px',
                  borderLeftColor: 'blue.600',
                  pl: '8',
                  py: '4',
                  my: 8,
                  color: 'gray.600',
                  bg: 'blue.50/30',
                  roundedRight: '2xl',
                  fontSize: '1.15rem',
                  '& p': { mb: '0' },
                },
                '& a': {
                  color: 'blue.600',
                  textDecoration: 'none',
                  borderBottomWidth: '1px',
                  borderBottomColor: 'blue.200',
                  transition: 'all 0.2s',
                  fontWeight: '600',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                  _hover: {
                    color: 'blue.700',
                    borderBottomColor: 'blue.600',
                    bg: 'blue.50/50',
                  },
                },
                '& img': {
                  rounded: '2xl',
                  w: 'full',
                  h: 'auto',
                  shadow: '2xl',
                  borderWidth: '1px',
                  borderColor: 'gray.100',
                },
                '& hr': {
                  my: 12,
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
                  boxShadow: 'sm',
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
                  transition: 'all 0.2s',
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
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={{
                  p({ children, ...props }) {
                    // <p> 안에 <div>가 들어가면 hydration 에러 발생 (e.g. Zoom 컴포넌트)
                    // children 중 block-level 요소가 있으면 <div>로 렌더링
                    const hasBlockChild = Array.isArray(children)
                      ? children.some(
                          (child: any) =>
                            typeof child === 'object' &&
                            child?.type &&
                            typeof child.type !== 'string', // React component (like Zoom)
                        )
                      : typeof children === 'object' &&
                        (children as any)?.type &&
                        typeof (children as any).type !== 'string';
                    if (hasBlockChild) {
                      return <div {...props}>{children}</div>;
                    }
                    return <p {...props}>{children}</p>;
                  },
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const content = String(children).replace(/\n$/, '');

                    if (match && match[1] === 'mermaid') {
                      return <Mermaid chart={content} />;
                    }

                    return match ? (
                      <div
                        className={css({
                          mb: '12',
                          mt: '8',
                          pos: 'relative',
                          shadow: '2xl',
                          rounded: '2xl',
                          overflow: 'hidden',
                          borderWidth: '1px',
                          borderColor: 'white/10',
                        })}
                      >
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
                          <div
                            className={css({
                              boxSize: '3',
                              rounded: 'full',
                              bg: '#ff5f56',
                            })}
                          />
                          <div
                            className={css({
                              boxSize: '3',
                              rounded: 'full',
                              bg: '#ffbd2e',
                            })}
                          />
                          <div
                            className={css({
                              boxSize: '3',
                              rounded: 'full',
                              bg: '#27c93f',
                            })}
                          />
                          {match[1] && (
                            <span
                              className={css({
                                ml: '4',
                                color: 'gray.500',
                                fontSize: 'xs',
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
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            borderRadius: 0,
                            margin: 0,
                            padding: '2rem',
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
                          css({
                            bg: 'gray.100',
                            color: 'red.500',
                            px: '1.5',
                            py: '0.5',
                            rounded: 'md',
                            fontSize: '0.85em',
                            fontWeight: '500',
                            borderWidth: '1px',
                            borderColor: 'gray.200',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }),
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  img({ src, alt }: any) {
                    // 상대 경로인 경우 (http로 시작하지 않는 경우) 경로 보정
                    const isRelative =
                      src && !src.startsWith('http') && !src.startsWith('/');

                    let imageSrc = src;
                    if (isRelative) {
                      imageSrc = `/posts/${post.relativeDir}/${src}`;
                    } else if (src.startsWith('/')) {
                      imageSrc = `${src}`;
                    }

                    return (
                      <Zoom>
                        <img
                          src={imageSrc}
                          alt={alt}
                          className={css({
                            display: 'block',
                            my: '14',
                            rounded: '2xl',
                            w: 'full',
                            h: 'auto',
                            shadow: '2xl',
                            borderWidth: '1px',
                            borderColor: 'gray.100',
                          })}
                        />
                      </Zoom>
                    );
                  },
                  table({ children, ...props }) {
                    return (
                      <div
                        className={css({
                          w: 'full',
                          overflowX: 'auto',
                          mb: '12',
                          mt: '8',
                        })}
                      >
                        <table
                          {...props}
                          className={css({
                            w: 'full',
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                          })}
                        >
                          {children}
                        </table>
                      </div>
                    );
                  },
                  li({ className, children, ...props }) {
                    const isTaskList = className?.includes('task-list-item');
                    if (isTaskList) {
                      const childrenArray = Children.toArray(children);
                      const checkbox = childrenArray[0];
                      const content = childrenArray.slice(1);

                      return (
                        <li className={className} {...props}>
                          {checkbox}
                          <div className={css({ flex: 1, minW: 0 })}>
                            {content}
                          </div>
                        </li>
                      );
                    }
                    return (
                      <li className={className} {...props}>
                        {children}
                      </li>
                    );
                  },
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            <div
              className={css({
                my: '12',
                display: 'flex',
                justifyContent: 'center',
              })}
            >
              <ShareButton title={post.title} />
            </div>

            <GiscusComments />
          </article>

          {/* Desktop Side TOC */}
          <DesktopTOC />
        </div>
      </SsgoiTransition>
    </>
  );
}
