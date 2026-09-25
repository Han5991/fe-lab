import { Children, type CSSProperties } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { css } from '@design-system/ui-lib/css';

import { CodeBlock } from '@/src/components/post/CodeBlock';
import { rehypeCodeMeta } from '@/src/components/post/codeMeta';
import { rehypeDropUnsafe } from '@/src/components/post/rehypeDropUnsafe';
import { CodeTabs } from '@/src/components/post/markdown/CodeTabs';
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
import { HEADER_OFFSET } from '@/src/components/post/headerOffset';
import { HEADING_COMPONENTS } from '@/src/components/post/markdownHeadings';
import { isMarkdownTag } from '@/src/components/post/markdownTag';
import { fencedCode, isBlockMarkdownChild } from './markdownBlocks';

/**
 * 글 본문 렌더 파이프라인의 단일 출처 — 마크다운 원문이 DOM이 되는 유일한 곳.
 *
 * 이 모듈은 훅·브라우저 API 없이 렌더돼야 한다: 본문 컴파일은 빌드 타임의
 * 일이고, 상호작용(복사·탭·mermaid·이미지 줌)은 매핑된 클라이언트
 * 컴포넌트가 각자 잎으로 진다. 테스트(`codeMeta.test.tsx` 등)는 여기서 export한
 * 실물 플러그인 배열·매핑 팩토리를 가져다 같은 경로를 검증한다.
 *
 * `#post-content`는 DOM 계약이다 — TOC·MobileTOC(`tocHooks.tsx`)가 이 id로
 * 헤딩을 스캔하므로, id와 헤딩 prose 스타일·rehype-slug는 언제나 함께 움직인다.
 */

export const POST_REMARK_PLUGINS = [remarkGfm];

// codeMeta는 rehypeRaw 앞 — raw의 재파싱이 펜스 메타(hast `data`)를 버린다.
// dropUnsafe는 rehypeRaw 뒤 — raw HTML이 요소가 된 뒤에야 태그 이름으로 가린다.
export const POST_REHYPE_PLUGINS = [
  rehypeCodeMeta,
  rehypeRaw,
  rehypeDropUnsafe,
  rehypeSlug,
];

/**
 * react-markdown의 `Components`에 **커스텀 태그를 더한 것**.
 *
 * 그 타입은 키가 `keyof JSX.IntrinsicElements`로 닫혀 있어 `callout`·`diagram`
 * 같은 태그를 표현하지 못한다. 런타임은 rehype-raw가 살려 낸 임의 태그를 그대로
 * 받으므로 못 담는 것은 타입뿐이다 — 교집합으로 그 태그들만 더한다. 결과가
 * `Components`의 부분형이라 `<ReactMarkdown components={…}>`에 그대로 들어간다.
 *
 * 예전에는 `as MarkdownComponents` 단언으로 넘겼다. 그러면 이 문제는 가려지지만
 * **표준 태그 매퍼(p·code·img·table·li)와 헤딩 스프레드까지 함께 느슨해지고**,
 * 오타 난 태그(`dialouge:`)나 빠뜨린 태그가 조용히 통과한다 — 커스텀 태그를 못
 * 적는다는 좁은 사실 때문에 객체 전체의 검사를 포기하는 거래였다. 애노테이션이면
 * 목록에 없는 키는 초과 프로퍼티로, 빠진 키는 누락으로 걸린다.
 *
 * `satisfies`로는 안 된다 — `Components`가 전부 optional인 weak type이라
 * "has no properties in common"으로 막힌다.
 */
type PostComponents = Components & {
  callout: typeof Callout;
  'code-tabs': typeof CodeTabs;
  'file-tree': typeof FileTree;
  dialogue: typeof Dialogue;
  msg: typeof Msg;
  metrics: typeof Metrics;
  metric: typeof Metric;
  timeline: typeof Timeline;
  step: typeof Step;
  diagram: typeof Diagram;
  'diagram-node': typeof DiagramNodeTag;
  'diagram-edge': typeof DiagramEdgeTag;
};

interface ImageProps {
  src?: unknown;
  alt?: string | undefined;
  width?: number | string | undefined;
  height?: number | string | undefined;
}

/**
 * 본문 components 매핑. `img` 매퍼가 글의 `relativeDir`을 닫아 잡으므로
 * 상수가 아니라 팩토리다.
 */
export function buildPostComponents(relativeDir: string): PostComponents {
  const image = ({ src, alt, width, height }: ImageProps, zoomable = true) => (
    <MarkdownImage
      src={typeof src === 'string' ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      relativeDir={relativeDir}
      zoomable={zoomable}
    />
  );

  return {
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
    // 펜스의 바깥 `<pre>`는 벗긴다 — CodeBlock이 `<figure>`로 그려 `<pre>` 안에
    // 두면 무효 중첩이다. 블록으로 그리지 않는 raw `<pre>`는 그대로 둔다.
    pre({ node: _node, children, ...props }) {
      const fence = fencedCode(children);
      return fence ?? <pre {...props}>{children}</pre>;
    },
    code(props) {
      return <CodeBlock {...props} />;
    },
    img(props) {
      return image(props);
    },
    // 링크로 감싼 이미지는 확대 없이 그린다 — 확대 래퍼(div·button)가 `<a>` 안이면
    // 무효 중첩에 대화형 요소 중첩이다.
    a({ node: _node, children, ...props }) {
      return (
        <a {...props}>
          {Children.map(children, child =>
            // `src`만 보면 `<video src>` 같은 raw HTML까지 이미지로 오인한다.
            isMarkdownTag<ImageProps>(child, 'img')
              ? image(child.props, false)
              : child,
          )}
        </a>
      );
    },
    table({ children, node, ...props }) {
      return (
        // 넓은 표는 가로로 스크롤하고 키보드로도 스크롤하게 초점을 받는다(axe
        // scrollable-region-focusable). 랜드마크라 이름은 표마다 달라야 한다.
        <div
          role="region"
          aria-label={tableLabel(node)}
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
              // 컨테이너보다 좁으면 100%로 채우고(w는 아래
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
            <div className={css({ flex: '1', minW: '0' })}>{content}</div>
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
    // 같은 명령을 도구별로 보여주는 코드 탭. 자식 펜스의
    // `tab="npm"` 메타를 읽어 탭 목록을 만든다.
    'code-tabs': CodeTabs,
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
  };
}

/** 표 이름을 짓는 데 읽는 hast 노드의 모양(react-markdown이 `node`로 넘긴다). */
interface HastLike {
  type?: string;
  tagName?: string;
  value?: string;
  children?: HastLike[];
}

function hastText(node: HastLike): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(hastText).join('');
}

function findElement(node: HastLike, tagName: string): HastLike | undefined {
  for (const child of node.children ?? []) {
    if (child.tagName === tagName) return child;
    const found = findElement(child, tagName);
    if (found) return found;
  }
  return undefined;
}

/**
 * 표 스크롤 영역의 접근 가능한 이름. `<caption>`이 있으면 그것, 없으면
 * 머리행의 칸 제목을 이어 붙인다(GFM 표는 언제나 머리행이 있다).
 */
function tableLabel(node: HastLike | undefined): string {
  if (!node) return '표';
  const caption = findElement(node, 'caption');
  const captionText = caption ? hastText(caption).trim() : '';
  if (captionText) return `표: ${captionText}`;

  const headerRow = findElement(node, 'tr');
  const headers = (headerRow?.children ?? [])
    .filter(cell => cell.tagName === 'th' || cell.tagName === 'td')
    .map(cell => hastText(cell).trim())
    .filter(Boolean);
  return headers.length > 0 ? `표: ${headers.join(', ')}` : '표';
}

interface PostBodyProps {
  /** 마크다운 원문 (`post.content`). */
  content: string;
  /** 글 폴더 기준 상대 경로 — 본문 이미지 src 해석에 쓴다. */
  relativeDir: string;
}

/**
 * 헤딩의 `scroll-margin-top` — `css()`는 정적 추출이라 JS 상수를 CSS 변수로 실어 보낸다.
 * 목차 활성 판정과 같은 `HEADER_OFFSET`이어야 이동 직후의 헤딩이 "보이는 곳"이 된다.
 */
const headingOffsetStyle: CSSProperties & Record<`--${string}`, string> = {
  '--post-heading-offset': `${HEADER_OFFSET}px`,
};

export function PostBody({ content, relativeDir }: PostBodyProps) {
  return (
    <div
      id="post-content"
      style={headingOffsetStyle}
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
          scrollMarginTop: '[var(--post-heading-offset)]',
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
          scrollMarginTop: '[var(--post-heading-offset)]',
        },
        '& h4': {
          fontSize: '[16px]',
          fontWeight: 'semibold',
          lineHeight: 'header',
          mt: '8',
          mb: '3',
          color: 'ink.950',
          scrollMarginTop: '[var(--post-heading-offset)]',
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
        // auto 보간에 필요한 interpolate-size는 panda.config.ts globalCss의 html에 있고,
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
          // 넘칠 때만 끊는다 — break-all은 평범한 단어 중간도 잘랐다.
          overflowWrap: 'anywhere',
          _hover: {
            // 보더는 비텍스트라 원색(accent.500)을 그대로 쓴다.
            borderBottomColor: 'accent.500',
            bg: 'accent.50',
          },
        },
        // 본문 이미지 모양은 MarkdownImage가 단일 출처다 — 여기 `& img`를 두면 명시도로 이긴다.
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
        remarkPlugins={POST_REMARK_PLUGINS}
        rehypePlugins={POST_REHYPE_PLUGINS}
        components={buildPostComponents(relativeDir)}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
