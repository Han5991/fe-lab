'use client';

import type { ComponentProps } from 'react';
import { Children } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { css } from '@design-system/ui-lib/css';

import type { PostData } from '@/domain/post';
import GiscusComments from '@/src/components/GiscusComments';
import { DiscoveryBand } from '@/src/components/blog/DiscoveryBand';
import { PageBoundary } from '@/src/components/PageBoundary';
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
import { Dialogue, Msg } from '@/src/components/post/markdown/Dialogue';
import { Metrics, Metric } from '@/src/components/post/markdown/Metrics';
import { Timeline, Step } from '@/src/components/post/markdown/Timeline';
import {
  Diagram,
  DiagramNodeTag,
  DiagramEdgeTag,
} from '@/src/components/diagram';

import { TOC } from '@/src/components/post/TOC';
import { ReadingProgress } from '@/src/components/post/ReadingProgress';
import { PostHeader } from '@/src/components/post/PostHeader';
import { PostHero } from '@/src/components/post/PostHero';
import { HEADING_COMPONENTS } from '@/src/components/post/markdownHeadings';
import { isBlockMarkdownChild } from './markdownBlocks';

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

      <PageBoundary
        // 썸네일 있으면 /posts/*(hero 모핑 대상), 없으면 /posts-plain/*(fade 폴백)으로
        // 분기해 전환 매칭을 라우팅한다. (URL은 그대로 /posts/{slug})
        transitionId={
          thumbnailUrl ? `/posts/${post.slug}` : `/posts-plain/${post.slug}`
        }
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

            {/* hero는 frontmatter 값 그대로다 — thumbnailUrl과 달리 경로 해석이
                없어서 page.tsx를 거칠 이유가 없다. */}
            <PostHero
              slug={post.slug}
              title={post.title}
              hero={post.hero}
              thumbnailUrl={thumbnailUrl}
            />

            <div
              id="post-content"
              className={css({
                // 리뉴얼로 세리프 정체성을 폐기했다. serif 토큰이 sans로
                // 매핑돼 있긴 하지만 의도를 코드에 남기려 명시적으로 sans.
                // 크기는 본문 가독성 기준인 lg(18px)를 유지한다 — 레퍼런스의
                // 14px은 목업 리드 문단이지 본문 스펙이 아니다.
                fontFamily: 'sans',
                fontSize: 'lg',
                lineHeight: 'prose',
                color: 'ink.900',
                // 본문 헤딩 스케일의 천장은 글 제목(22px)이다. 예전 스케일은
                // h1이 30px이라 제목보다 커서 위계가 뒤집혀 있었다. 레퍼런스가
                // 22px을 최대 크기로 두는 이상 본문 헤딩이 그 위로 올라갈 수
                // 없어서, 20 → 18 → 16으로 좁게 다시 깔았다.
                // 간격이 좁은 만큼 구분은 크기와 여백(mt), 그리고 **색**이
                // 맡는다. 20 → 18 → 16은 2px씩밖에 안 벌어져서 크기만으로는
                // h2와 h3가 잘 안 갈린다. 최상위(h2)에만 액센트를 주면
                // "대단원 / 그 아래"가 한눈에 잘리고, h3·h4는 무채색으로 남아
                // 본문 흐름을 끊지 않는다.
                //
                // `& h1` 규칙은 없다 — 본문 h1은 렌더 시 h2로 강등되므로
                // (markdownHeadings.tsx) 이 컨테이너 안에 h1이 나올 수 없다.
                // 페이지의 h1은 PostHeader의 글 제목 하나뿐이다.
                '& h2': {
                  fontSize: '[20px]',
                  fontWeight: 'semibold',
                  letterSpacing: 'tightXs',
                  mt: '12',
                  mb: '4',
                  color: 'accent.900',
                  lineHeight: 'header',
                  scrollMarginTop: '[100px]',
                },
                // h3는 본문(18px)과 크기가 같다. 굵기·색(ink.950)·위 여백으로
                // 구분되므로 크기까지 벌리면 위 단계와 붙어버린다.
                '& h3': {
                  fontSize: '[18px]',
                  fontWeight: 'semibold',
                  lineHeight: 'header',
                  mt: '10',
                  mb: '3',
                  color: 'ink.950',
                  scrollMarginTop: '[100px]',
                },
                '& h4': {
                  fontSize: '[16px]',
                  fontWeight: 'semibold',
                  lineHeight: 'header',
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
                // 인라인 코드 스타일은 CodeBlock의 인라인 분기가 전담한다.
                // ReactMarkdown의 code 매퍼가 모든 <code>를 CodeBlock으로
                // 보내고 CodeBlock이 항상 클래스를 붙이므로, 여기에
                // `& code:not([class])` 규칙을 두면 절대 매칭되지 않는다.
                // 인용은 Dialogue와 같은 2px hairline 좌측 바로 통일한다.
                '& blockquote': {
                  borderLeftWidth: '[2px]',
                  borderLeftColor: 'ink.border',
                  pl: '4',
                  py: '1',
                  my: '6',
                  color: 'ink.600',
                  '& p': { mb: '0' },
                },
                // 본문에서 비켜둔 보조 설명(측정 방법론·재현 환경 고지 등)을 접어두는 블록.
                // 펼침 애니메이션은 ::details-content의 block-size를 0 ↔ auto로 전환한다.
                // auto 보간에 필요한 interpolate-size는 globals.css의 :root에 있고,
                // 미지원 브라우저는 애니메이션 없이 즉시 펼쳐진다(기능 손실 없음).
                '& details': {
                  my: '6',
                  borderWidth: 'hairline',
                  borderColor: 'ink.border',
                  rounded: 'control',
                  bg: 'paper.100',
                  px: '4',
                },
                '& details > summary': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2',
                  py: '3',
                  cursor: 'pointer',
                  listStyle: '[none]',
                  userSelect: 'none',
                  color: 'ink.600',
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  transition: '[color 0.15s]',
                  _hover: { color: 'ink.900' },
                  // Safari의 기본 삼각형 마커 제거 — 아래 ::before로 대체한다
                  '&::-webkit-details-marker': { display: 'none' },
                  '&::before': {
                    content: '"▸"',
                    display: 'inline-block',
                    flexShrink: '0',
                    color: 'ink.500',
                    transition: '[transform 0.25s ease]',
                  },
                },
                '& details[open] > summary::before': {
                  transform: '[rotate(90deg)]',
                },
                '& details::details-content': {
                  blockSize: '[0]',
                  overflow: 'hidden',
                  transition:
                    '[block-size 0.28s ease, content-visibility 0.28s allow-discrete]',
                },
                '& details[open]::details-content': { blockSize: '[auto]' },
                // 접힌 영역 안쪽 여백 정리 — 첫 요소는 summary에 붙고 마지막은 아래 여백만
                '& details > summary + *': { mt: '0' },
                '& details > *:last-child': { mb: '4' },
                '@media (prefers-reduced-motion: reduce)': {
                  '& details::details-content': { transition: '[none]' },
                  '& details > summary::before': { transition: '[none]' },
                },
                '& a': {
                  color: 'accent.600',
                  textDecorationLine: 'none',
                  borderBottomWidth: 'hairline',
                  borderBottomColor: 'accent.200',
                  transition: '[all 0.15s]',
                  fontWeight: 'medium',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                  _hover: {
                    // 보더는 비텍스트라 원색(accent.500)을 그대로 쓴다.
                    borderBottomColor: 'accent.500',
                    bg: 'accent.50',
                  },
                },
                '& img': {
                  rounded: 'control',
                  w: 'full',
                  h: 'auto',
                  borderWidth: 'hairline',
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
                  // 상하 여백은 가로 스크롤 래퍼가 가진다. 여기서도 주면
                  // 래퍼 여백과 겹쳐 표 앞뒤가 두 배로 벌어진다.
                  borderCollapse: 'separate',
                  borderSpacing: '0',
                  fontSize: 'sm',
                  fontFamily: 'sans',
                  borderWidth: 'hairline',
                  borderColor: 'ink.border',
                },
                '& th': {
                  bg: 'paper.100',
                  fontWeight: 'semibold',
                  p: '4',
                  borderBottomWidth: 'hairline',
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
                  borderBottomWidth: 'hairline',
                  borderColor: 'ink.border',
                  color: 'ink.700',
                },
                // borderWidths 토큰은 hairline 하나뿐이라 0은 이스케이프해서 쓴다
                '& tr:last-child td': { borderBottomWidth: '[0]' },
                '& tr:hover td': { bg: 'paper.100' },
              })}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={
                  {
                    // 본문 h1 → h2 강등. 페이지의 h1은 PostHeader의 글 제목
                    // 하나뿐이어야 한다(markdownHeadings.tsx 참고).
                    ...HEADING_COMPONENTS,
                    p({ children, node: _node, ...props }) {
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
                    table({ children, node: _node, ...props }) {
                      return (
                        // 열이 많은 표는 본문 폭(모바일 ~310px)을 넘는다. 감싸지
                        // 않으면 마지막 열이 잘린 채 스크롤도 안 된다.
                        //
                        // tabIndex+role로 키보드 초점을 받게 한다 — 마우스 없이
                        // 스크롤할 방법이 사라지면 안 된다(axe
                        // scrollable-region-focusable).
                        <div
                          role="region"
                          aria-label="표"
                          tabIndex={0}
                          className={css({
                            overflowX: 'auto',
                            overscrollBehaviorX: 'contain',
                            mb: '8',
                            mt: '6',
                            // 스크롤 컨테이너의 초점 링이 표 테두리에 붙지 않게
                            borderRadius: 'control',
                          })}
                        >
                          <table
                            {...props}
                            className={css({
                              // 컨테이너보다 좁으면 100%로 채우고(w는 위
                              // `& table` 규칙이 준다), 넓으면 내용 폭을 지켜
                              // 가로 스크롤이 생긴다. 이게 없으면 칸이
                              // 찌그러져 글자만 세로로 쌓인다.
                              minW: '[max-content]',
                            })}
                          >
                            {children}
                          </table>
                        </div>
                      );
                    },
                    li({ className, children, node: _node, ...props }) {
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
                    // 시그니처 컴포넌트도 기존 callout/file-tree와 똑같이
                    // rehype-raw가 살려준 소문자 커스텀 태그로 등록한다
                    // (MDX 없이 마크다운에서 <dialogue> 처럼 쓴다).
                    dialogue: Dialogue,
                    msg: Msg,
                    metrics: Metrics,
                    metric: Metric,
                    timeline: Timeline,
                    step: Step,
                    // 선언형 다이어그램 — 좌표를 손으로 박은 SVG 컴포넌트를
                    // 만들지 않고 글에서 바로 그릴 때 쓴다. 복잡한 그림은
                    // `<diagram name="…">`로 레지스트리의 컴포넌트를 부른다.
                    diagram: Diagram,
                    'diagram-node': DiagramNodeTag,
                    'diagram-edge': DiagramEdgeTag,
                  } as ComponentProps<typeof ReactMarkdown>['components']
                }
              >
                {post.content}
              </ReactMarkdown>
            </div>

            <div
              className={css({
                mt: '14',
                pt: '6',
                borderTopWidth: 'hairline',
                borderColor: 'ink.border',
                display: 'flex',
                justifyContent: 'flex-end',
              })}
            >
              <ShareButton title={post.title} />
            </div>

            {/* 홈의 발견 면과 같은 밴드 머리를 쓴다. 예전에는 라벨이 아예 없어
                Giscus 위젯이 아무 예고 없이 나타났고, 로딩 전에는 그 자리가
                빈 공백이라 글이 끝난 건지 덜 그려진 건지 알 수 없었다. */}
            <div className={css({ mt: '10' })}>
              <DiscoveryBand id="post-comments" title="댓글" />
              <div className={css({ mt: '[14px]' })}>
                <GiscusComments />
              </div>
            </div>
          </article>

          <TOC />
        </div>
      </PageBoundary>
    </>
  );
}
