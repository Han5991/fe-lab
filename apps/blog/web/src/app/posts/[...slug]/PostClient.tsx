'use client';

import { Children } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';

import type { PostData } from '@/lib/posts';
import GiscusComments from '@/src/components/GiscusComments';
import { useViewCount } from '@/lib/hooks/useViewCount';
import { ReadingProgressBar } from '@/src/components/mobile/ReadingProgressBar';
import { BackToTop } from '@/src/components/mobile/BackToTop';
import { MobileTOC } from '@/src/components/mobile/MobileTOC';
import { ShareButton } from '@/src/components/mobile/ShareButton';
import { DesktopTOC } from '@/src/components/desktop/DesktopTOC';
import { CodeBlock } from '@/src/components/post/CodeBlock';
import { MarkdownImage } from '@/src/components/post/MarkdownImage';

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
          py: '16',
        })}
      >
        <div
          className={css({
            display: 'flex',
            gap: '12',
            justifyContent: 'center',
          })}
        >
          {/* Main Content Article */}
          <article className={css({ flex: 1, maxW: '720px', minW: 0 })}>
            <header
              className={css({
                mb: '12',
                pb: '10',
                borderBottomWidth: '1px',
                borderColor: 'ink.border',
              })}
            >
              <p
                className={css({
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  letterSpacing: 'widest',
                  textTransform: 'uppercase',
                  color: 'accent.600',
                  mb: '4',
                })}
              >
                Lab Log
              </p>
              <h1
                className={css({
                  fontSize: { base: '3xl', md: '4xl' },
                  fontWeight: 'extrabold',
                  letterSpacing: 'tight',
                  lineHeight: '1.2',
                  mb: '6',
                  color: 'ink.950',
                })}
              >
                {post.title}
              </h1>
              <div
                className={css({
                  display: 'flex',
                  gap: '4',
                  alignItems: 'center',
                  color: 'ink.500',
                  fontSize: 'sm',
                  flexWrap: 'wrap',
                })}
              >
                <a
                  href="/about"
                  className={css({
                    color: 'ink.700',
                    fontWeight: 'semibold',
                    _hover: { color: 'accent.600' },
                    transition: 'color 0.15s',
                  })}
                  rel="author"
                >
                  Sangwook Han
                </a>
                <span
                  className={css({
                    w: '1',
                    h: '1',
                    rounded: 'full',
                    bg: 'ink.200',
                    display: 'inline-block',
                  })}
                />
                {post.date && (
                  <time
                    dateTime={post.date}
                    className={css({ color: 'ink.500' })}
                  >
                    {new Date(post.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      timeZone: 'Asia/Seoul',
                    })}
                  </time>
                )}
                <span
                  className={css({
                    w: '1',
                    h: '1',
                    rounded: 'full',
                    bg: 'ink.200',
                    display: 'inline-block',
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
                width={1200}
                height={630}
                className={css({
                  mb: '10',
                  rounded: 'xl',
                  w: 'full',
                  h: 'auto',
                  borderWidth: '1px',
                  borderColor: 'ink.border',
                  display: 'block',
                })}
              />
            )}

            {/* Article body */}
            <div
              id="post-content"
              className={css({
                fontSize: '1.0625rem',
                lineHeight: '1.85',
                color: 'ink.700',
                '& h1': {
                  fontSize: { base: '2xl', md: '3xl' },
                  fontWeight: '800',
                  mt: '14',
                  mb: '5',
                  color: 'ink.950',
                  letterSpacing: 'tight',
                  lineHeight: '1.25',
                  scrollMarginTop: '100px',
                },
                '& h2': {
                  fontSize: { base: 'xl', md: '2xl' },
                  fontWeight: '700',
                  mt: '12',
                  mb: '5',
                  color: 'ink.950',
                  letterSpacing: 'tight',
                  lineHeight: '1.3',
                  scrollMarginTop: '100px',
                },
                '& h3': {
                  fontSize: 'lg',
                  fontWeight: '700',
                  mt: '10',
                  mb: '4',
                  color: 'ink.950',
                  scrollMarginTop: '100px',
                },
                '& h4': {
                  fontSize: 'base',
                  fontWeight: '600',
                  mt: '8',
                  mb: '3',
                  color: 'ink.950',
                  scrollMarginTop: '100px',
                },
                '& p': { mb: '6' },
                '& ul': { listStyleType: 'disc', pl: '6', mb: '6' },
                '& ol': { listStyleType: 'decimal', pl: '6', mb: '6' },
                '& li': { mb: '2', pl: '1' },
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
                  accentColor: 'token(colors.accent.600)',
                  boxSize: '4',
                },
                '& del': {
                  color: 'ink.500',
                },
                '& code:not([class])': {
                  bg: 'ink.100',
                  px: '1.5',
                  py: '0.5',
                  rounded: 'md',
                  fontSize: '0.85em',
                  color: 'accent.600',
                  fontWeight: '500',
                  borderWidth: '1px',
                  borderColor: 'ink.border',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                },
                '& blockquote': {
                  borderLeftWidth: '3px',
                  borderLeftColor: 'accent.600',
                  pl: '6',
                  py: '1',
                  my: '8',
                  color: 'ink.700',
                  fontSize: '1.05rem',
                  '& p': { mb: '0' },
                },
                '& a': {
                  color: 'accent.600',
                  textDecoration: 'none',
                  borderBottomWidth: '1px',
                  borderBottomColor: 'accent.200',
                  transition: 'all 0.15s',
                  fontWeight: '500',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                  _hover: {
                    borderBottomColor: 'accent.600',
                    bg: 'accent.50',
                  },
                },
                '& img': {
                  rounded: 'lg',
                  w: 'full',
                  h: 'auto',
                  borderWidth: '1px',
                  borderColor: 'ink.border',
                  my: '2',
                },
                '& hr': {
                  my: '10',
                  h: '1px',
                  border: 'none',
                  bg: 'ink.border',
                },
                '& table': {
                  w: 'full',
                  mb: '8',
                  mt: '6',
                  borderCollapse: 'separate',
                  borderSpacing: '0',
                  fontSize: 'sm',
                  borderWidth: '1px',
                  borderColor: 'ink.border',
                  rounded: 'lg',
                  overflow: 'hidden',
                },
                '& th': {
                  bg: 'ink.50',
                  fontWeight: 'bold',
                  p: '4',
                  borderBottomWidth: '1px',
                  borderColor: 'ink.border',
                  textAlign: 'left',
                  color: 'ink.950',
                  fontSize: 'xs',
                  letterSpacing: 'wide',
                  textTransform: 'uppercase',
                },
                '& td': {
                  p: '4',
                  borderBottomWidth: '1px',
                  borderColor: 'ink.border',
                  color: 'ink.700',
                },
                '& tr:last-child td': {
                  borderBottomWidth: '0',
                },
                '& tr:hover td': {
                  bg: 'ink.50',
                },
              })}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={{
                  p({ children, ...props }) {
                    const hasBlockChild = Array.isArray(children)
                      ? children.some(
                          (child: any) =>
                            typeof child === 'object' &&
                            child?.type &&
                            typeof child.type !== 'string',
                        )
                      : typeof children === 'object' &&
                        (children as any)?.type &&
                        typeof (children as any).type !== 'string';
                    if (hasBlockChild) {
                      return <div {...props}>{children}</div>;
                    }
                    return <p {...props}>{children}</p>;
                  },
                  code(props) {
                    return <CodeBlock {...props} />;
                  },
                  img({ src, alt }: any) {
                    return (
                      <MarkdownImage
                        src={src}
                        alt={alt}
                        relativeDir={post.relativeDir}
                      />
                    );
                  },
                  table({ children, ...props }) {
                    return (
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
                mt: '14',
                pt: '8',
                borderTopWidth: '1px',
                borderColor: 'ink.border',
                display: 'flex',
                justifyContent: 'flex-end',
              })}
            >
              <ShareButton title={post.title} />
            </div>

            <div className={css({ mt: '10' })}>
              <GiscusComments />
            </div>
          </article>

          {/* Desktop Side TOC */}
          <DesktopTOC />
        </div>
      </SsgoiTransition>
    </>
  );
}
