'use client';

import { Children } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';

import type { PostData } from '@/domain/post';
import GiscusComments from '@/src/components/GiscusComments';
import { useViewCount } from '@/src/hooks/useViewCount';
import { useRecordRecentView } from '@/src/hooks/useRecentViews';
import { BackToTop } from '@/src/components/mobile/BackToTop';
import { MobileTOC } from '@/src/components/mobile/MobileTOC';
import { ShareButton } from '@/src/components/mobile/ShareButton';
import { CodeBlock } from '@/src/components/post/CodeBlock';
import { MarkdownImage } from '@/src/components/post/MarkdownImage';
import { Callout } from '@/src/components/post/markdown/Callout';
import { Figure } from '@/src/components/post/markdown/Figure';
import { FileTree } from '@/src/components/post/markdown/FileTree';

import {
  TOC,
  ReadingProgress,
  PostHeader,
} from '@/src/components/blog';

interface PostClientProps {
  post: PostData;
  thumbnailUrl?: string;
  previewMode?: boolean;
  seriesIndex?: { current: number; total: number; displayName: string };
}

export default function PostClient({
  post,
  thumbnailUrl,
  previewMode = false,
  seriesIndex,
}: PostClientProps) {
  useViewCount(previewMode ? null : post.slug);
  useRecordRecentView(previewMode ? null : post.slug, post.title);

  return (
    <>
      <ReadingProgress />
      <BackToTop />

      <div className={css({ display: 'block', lg: { display: 'none' } })}>
        <MobileTOC />
      </div>

      <SsgoiTransition
        id={`/posts/${post.slug}`}
        className={css({
          maxW: 'articleW',
          mx: 'auto',
          px: '8',
          py: { base: '10', md: '14' },
          bg: 'paper.50',
        })}
      >
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: { base: '1fr', lg: '[1fr 240px]' },
            gap: { base: '0', lg: '16' },
            alignItems: 'start',
          })}
        >
          <article
            className={css({
              maxW: 'proseW',
              minW: '0',
              mx: { base: 'auto', lg: '0' },
              w: 'full',
            })}
          >
            <PostHeader post={post} seriesIndex={seriesIndex} />

            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={post.title}
                width={1200}
                height={630}
                className={css({
                  display: 'block',
                  mb: '10',
                  w: 'full',
                  h: 'auto',
                  borderWidth: '[1px]',
                  borderColor: 'ink.border',
                })}
              />
            )}

            <div
              id="post-content"
              className={css({
                fontFamily: 'serif',
                fontSize: 'lg',
                lineHeight: 'prose',
                color: 'ink.900',
                '& h1': {
                  fontFamily: 'serif',
                  fontSize: { base: '2xl', md: '3xl' },
                  fontWeight: 'semibold',
                  letterSpacing: 'tightSm',
                  mt: '14',
                  mb: '5',
                  color: 'ink.950',
                  lineHeight: 'tight',
                  scrollMarginTop: '[100px]',
                },
                '& h2': {
                  fontFamily: 'serif',
                  fontSize: { base: 'xl', md: '2xl' },
                  fontWeight: 'semibold',
                  letterSpacing: 'tightXs',
                  mt: '12',
                  mb: '4',
                  color: 'ink.950',
                  lineHeight: 'header',
                  scrollMarginTop: '[100px]',
                },
                '& h3': {
                  fontFamily: 'serif',
                  fontSize: 'xl',
                  fontWeight: 'semibold',
                  fontStyle: 'italic',
                  mt: '10',
                  mb: '3',
                  color: 'ink.950',
                  scrollMarginTop: '[100px]',
                },
                '& h4': {
                  fontFamily: 'serif',
                  fontSize: 'lg',
                  fontWeight: 'semibold',
                  mt: '8',
                  mb: '3',
                  color: 'ink.950',
                  scrollMarginTop: '[100px]',
                },
                '& p': { mb: '6' },
                '& ul': { listStyleType: 'disc', pl: '6', mb: '6' },
                '& ol': { listStyleType: 'decimal', pl: '6', mb: '6' },
                '& li': { mb: '2', pl: '1' },
                '& li > ul': { mt: '2', mb: '0' },
                '& li.task-list-item > div > ul': { mt: '2', mb: '0' },
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
                  accentColor: '[token(colors.marker.600)]',
                  boxSize: '4',
                },
                '& del': { color: 'ink.500' },
                '& code:not([class])': {
                  fontFamily: 'mono',
                  bg: 'paper.100',
                  px: '1.5',
                  py: '0.5',
                  rounded: 'sm',
                  fontSize: '[0.92em]',
                  color: 'marker.600',
                  fontWeight: 'medium',
                  borderWidth: '[1px]',
                  borderColor: 'ink.border',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                },
                '& blockquote': {
                  borderLeftWidth: '[2px]',
                  borderLeftColor: 'marker.300',
                  pl: '6',
                  py: '1',
                  my: '8',
                  color: 'ink.700',
                  fontStyle: 'italic',
                  '& p': { mb: '0' },
                },
                '& a': {
                  color: 'accent.600',
                  textDecorationLine: 'none',
                  borderBottomWidth: '[1px]',
                  borderBottomColor: 'accent.200',
                  transition: '[all 0.15s]',
                  fontWeight: 'medium',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                  _hover: {
                    borderBottomColor: 'accent.600',
                    bg: 'accent.50',
                  },
                },
                '& img': {
                  rounded: 'sm',
                  w: 'full',
                  h: 'auto',
                  borderWidth: '[1px]',
                  borderColor: 'ink.border',
                  my: '4',
                },
                '& hr': {
                  my: '10',
                  h: '[1px]',
                  border: '[none]',
                  bg: 'ink.border',
                },
                '& table': {
                  w: 'full',
                  mb: '8',
                  mt: '6',
                  borderCollapse: 'separate',
                  borderSpacing: '0',
                  fontSize: 'sm',
                  fontFamily: 'sans',
                  borderWidth: '[1px]',
                  borderColor: 'ink.border',
                },
                '& th': {
                  bg: 'paper.100',
                  fontWeight: 'semibold',
                  p: '4',
                  borderBottomWidth: '[1px]',
                  borderColor: 'ink.border',
                  textAlign: 'left',
                  color: 'ink.950',
                  fontSize: 'xs',
                  letterSpacing: 'mono',
                  textTransform: 'uppercase',
                  fontFamily: 'mono',
                },
                '& td': {
                  p: '4',
                  borderBottomWidth: '[1px]',
                  borderColor: 'ink.border',
                  color: 'ink.700',
                },
                '& tr:last-child td': { borderBottomWidth: '0' },
                '& tr:hover td': { bg: 'paper.100' },
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
                          borderSpacing: '0',
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
                          <div className={css({ flex: '1', minW: '0' })}>
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
                  callout: Callout,
                  'file-tree': FileTree,
                  figure: Figure,
                } as React.ComponentProps<typeof ReactMarkdown>['components']}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            <div
              className={css({
                mt: '14',
                pt: '6',
                borderTopWidth: '[1px]',
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

          <TOC />
        </div>
      </SsgoiTransition>
    </>
  );
}
