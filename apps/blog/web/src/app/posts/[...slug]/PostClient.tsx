'use client';

import { Children, isValidElement } from 'react';
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

import { TOC } from '@/src/components/post/TOC';
import { ReadingProgress } from '@/src/components/post/ReadingProgress';
import { PostHeader } from '@/src/components/post/PostHeader';

/**
 * <p>로 감싸이지만 실제로는 블록 요소를 렌더하는 커스텀 컴포넌트.
 * 이들이 <p> 안에 들어가면 무효 중첩(<p><div>…</div></p>)이 되어
 * 브라우저가 <p>를 조기 종료 → SSR/CSR 트리가 어긋나며 hydration mismatch가 난다.
 */
const BLOCK_MARKDOWN_COMPONENTS = new Set<unknown>([Callout, Figure, FileTree]);

/**
 * react-markdown이 단락(<p>)으로 감싼 자식이 블록 요소라서
 * <p> 대신 <div>로 감싸야 하는지 판별한다.
 *
 * 커스텀 블록 컴포넌트는 참조(identity)로, fenced code는 공개 prop인
 * `className`의 `language-*`로 식별한다 — react-markdown 내부 `node` prop에
 * 의존하지 않으므로 라이브러리 업그레이드로 node 형태가 바뀌어도 회귀하지 않는다.
 * 인라인 code·이미지 등 phrasing 콘텐츠는 <p> 안에 유효하므로 블록으로 보지
 * 않는다 — 불필요하게 <div>로 감싸면 `& p` 마진/타이포가 빠지기 때문.
 */
function isBlockMarkdownChild(child: unknown): boolean {
  if (!isValidElement(child)) return false;
  if (BLOCK_MARKDOWN_COMPONENTS.has(child.type)) return true;
  // CodeBlock은 language-* 클래스가 있을 때(fenced code)만 블록 <div>를 렌더한다.
  const className = (child.props as { className?: string }).className;
  return typeof className === 'string' && /\blanguage-/.test(className);
}

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
        // 썸네일 있으면 /posts/*(hero 모핑 대상), 없으면 /posts-plain/*(fade 폴백)으로
        // 분기해 전환 매칭을 라우팅한다. (URL은 그대로 /posts/{slug})
        id={thumbnailUrl ? `/posts/${post.slug}` : `/posts-plain/${post.slug}`}
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
                // 목록 카드 썸네일(data-hero-exit-key)과 같은 키 → hero 모핑 짝.
                // 이 블록은 썸네일이 있을 때만 렌더되므로 무조건 부여.
                data-hero-enter-key={`post-${post.slug}`}
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
                components={
                  {
                    p({ children, ...props }) {
                      const hasBlockChild = Array.isArray(children)
                        ? children.some(isBlockMarkdownChild)
                        : isBlockMarkdownChild(children);
                      if (hasBlockChild) {
                        return <div {...props}>{children}</div>;
                      }
                      return <p {...props}>{children}</p>;
                    },
                    code(props) {
                      return <CodeBlock {...props} />;
                    },
                    img({ src, alt }) {
                      return (
                        <MarkdownImage
                          src={typeof src === 'string' ? src : undefined}
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
                  } as React.ComponentProps<typeof ReactMarkdown>['components']
                }
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
