'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { css, cx } from '@design-system/ui-lib/css';
import mermaid from 'mermaid';
import { SsgoiTransition } from '@ssgoi/react';
import type { PostData } from '@/lib/posts';
import GiscusComments from '@/src/components/GiscusComments';

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
          const { svg } = await mermaid.render(
            `mermaid-${Math.random().toString(36).substr(2, 9)}`,
            chart,
          );
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

export default function PostClient({ post }: { post: PostData }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <SsgoiTransition id={`/posts/${post.slug}`}>
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
          isVisible && css({ opacity: 1, transform: 'translateY(0)' }),
        )}
      >
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
              <time dateTime={post.date} className={css({ color: 'gray.500' })}>
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

        <div
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
            },
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
                w: 'full',
                h: '1',
                bg: 'blue.600',
                rounded: 'full',
              },
            },
            '& h3': {
              fontSize: 'xl',
              fontWeight: '700',
              mt: '12',
              mb: '4',
              color: 'gray.900',
            },
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
              borderRadius: 'md',
              fontSize: '0.85em',
              color: 'red.500',
              fontWeight: '500',
              fontFamily: 'mono',
              borderWidth: '1px',
              borderColor: 'gray.200',
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
              _hover: {
                color: 'blue.700',
                borderBottomColor: 'blue.600',
                bg: 'blue.50/50',
              },
            },
            '& img': {
              borderRadius: '2xl',
              my: '14',
              w: 'full',
              h: 'auto',
              shadow: '2xl',
              borderWidth: '1px',
              borderColor: 'gray.100',
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
            components={{
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
                      position: 'relative',
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
                      css({
                        bg: 'gray.100',
                        color: 'red.500',
                        px: '1.5',
                        py: '0.5',
                        rounded: 'md',
                        fontFamily: 'mono',
                        fontSize: '0.85em',
                        fontWeight: '500',
                        borderWidth: '1px',
                        borderColor: 'gray.200',
                      }),
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              img({ src, alt }: any) {
                const isDev = process.env.NODE_ENV === 'development';
                const PREFIX = isDev ? '' : '/fe-lab';

                // 마크다운 파서가 공백을 %20으로 인코딩해서 줄 수 있으므로 먼저 디코딩
                const decodedSrc = src ? decodeURIComponent(src) : '';
                let imageSrc = src;

                if (src && !src.startsWith('http')) {
                  if (src.startsWith('/')) {
                    imageSrc = `${PREFIX}${src}`;
                  } else {
                    // 상대 경로인 경우
                    if (isDev) {
                      // 개발 환경: 로컬 API 사용 (decodedSrc 사용)
                      const relativePath = `${post.relativeDir}/${decodedSrc}`;
                      imageSrc = `/api/local-image?path=${encodeURIComponent(
                        relativePath,
                      )}`;
                    } else {
                      // 프로덕션 환경: 정적 경로 사용
                      imageSrc = `${PREFIX}/posts/${post.relativeDir}/${decodedSrc}`;
                    }
                  }
                }

                return (
                  <img
                    src={imageSrc}
                    alt={alt}
                    className={css({
                      display: 'block',
                      my: '14',
                      borderRadius: '2xl',
                      w: 'full',
                      h: 'auto',
                      shadow: '2xl',
                      borderWidth: '1px',
                      borderColor: 'gray.100',
                    })}
                  />
                );
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
        <GiscusComments />
      </div>
    </SsgoiTransition>
  );
}
