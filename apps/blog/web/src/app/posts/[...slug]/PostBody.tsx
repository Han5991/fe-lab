import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { css, cx } from '@blog/styled-system/css';

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
import { inlineLink } from '@/src/components/inlineLink';
import { pressToggle } from '@/src/components/interaction';
import { HEADER_OFFSET } from '@/src/components/post/headerOffset';
import { HEADING_COMPONENTS } from '@/src/components/post/markdownHeadings';
import { isMarkdownTag } from '@/src/components/post/markdownTag';
import { POST_CONTENT_ID } from '@/src/components/post/postContent';
import { fencedCode, isBlockMarkdownChild } from './markdownBlocks';

/**
 * 글 본문 렌더 파이프라인의 단일 출처 — 마크다운 원문이 DOM이 되는 유일한 곳.
 *
 * 이 모듈은 훅·브라우저 API 없이 렌더돼야 한다: 본문 컴파일은 빌드 타임의
 * 일이고, 상호작용(복사·탭·mermaid·이미지 줌)은 매핑된 클라이언트
 * 컴포넌트가 각자 잎으로 진다. 테스트(`codeMeta.test.tsx` 등)는 여기서 export한
 * 실물 플러그인 배열·매핑 팩토리를 가져다 같은 경로를 검증한다.
 *
 * 본문 id(`POST_CONTENT_ID`, `post/postContent.ts`)는 DOM 계약이다 — `tocHooks.tsx`·`Rail.tsx`의
 * `railWithAside`·`QuoteLink`가 읽는다. id와 헤딩 prose 스타일·rehype-slug는 언제나 함께 움직인다.
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

type CheckboxElement = ReactElement<InputHTMLAttributes<HTMLInputElement>>;

function isCheckbox(node: ReactNode): node is CheckboxElement {
  return (
    isValidElement<InputHTMLAttributes<HTMLInputElement>>(node) &&
    node.props.type === 'checkbox'
  );
}

/**
 * GFM 체크박스(`- [x]`)에는 라벨이 없다(axe label). 항목 글을 **참조로** 이름 삼는다
 * (`aria-labelledby`) — 글을 문자열로 베끼면 이미지 alt·커스텀 태그가 빠진다.
 * id는 원문 위치(hast offset)에서 짓는다: 서버 컴포넌트라 훅 없이 결정적이어야 한다.
 */
/** hast 노드에서 쓰는 축은 원문 위치뿐이다. */
interface PositionedNode {
  position?: { start: { offset?: number | undefined } } | undefined;
}

function taskLabelId(node: PositionedNode | undefined): string | undefined {
  const offset = node?.position?.start.offset;
  return offset === undefined ? undefined : `task-label-${offset}`;
}

/**
 * 느슨한 목록(항목 사이 빈 줄)은 remark가 체크박스를 첫 `<p>` 안에 넣는다 — 그
 * 문단의 나머지 글을 라벨로 감싼다. 모양이 다르면 손대지 않는다.
 */
function labelLooseTask(first: ReactNode, labelId: string): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(first)) return first;
  const [box, ...rest] = Children.toArray(first.props.children);
  if (!isCheckbox(box)) return first;
  return cloneElement(
    first,
    {},
    cloneElement(box, { 'aria-labelledby': labelId }),
    <span id={labelId}>{rest}</span>,
  );
}

/**
 * 원고가 raw HTML로 박은 글자색(`<span style="color:red">`) → 토큰.
 *
 * 원색 `red`는 흰 지면 위 4.0:1로 AA에 못 미치고, `#e11d48`은 다크 지면 위 4.1:1이다 —
 * 리터럴이라 테마 전환을 타지 않는다. 원고의 강조 의도(빨강)는 살리되 값은
 * `danger.text`(라이트/다크 두 벌)로 바꾼다. 키의 hex는 색을 쓰는 게 아니라 원고에
 * 적힌 문자열을 찾는 열쇠다(§9의 hex 금지와 무관).
 *
 * 지금 공개 글이 쓰는 값만 적는다. 목록에 없는 색은 원고대로 나가고, 그런 글은
 * 런타임 게이트가 라이트·다크 **양쪽** axe를 돌린다(e2e `representatives()`의
 * `inlineColorPosts`) — 대비가 모자라면 거기서 잡히고, 그때 여기 더한다.
 */
const authorDanger = css({ color: 'danger.text' });
const AUTHOR_COLOR_CLASS: Readonly<Record<string, string>> = {
  red: authorDanger,
  '#e11d48': authorDanger,
};

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
    // 무효 중첩에 대화형 요소 중첩이다. 링크 모양은 문장 속 링크의 단일 출처(inlineLink)다.
    a({ node: _node, children, className, ...props }) {
      return (
        <a {...props} className={cx(className, inlineLink)}>
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
            my: '4',
            // 보더와 라운드는 스크롤하는 이 래퍼가 쥔다 — 표에 걸면 가로로 스크롤될 때 보더가
            // 표와 함께 밀려 나가고, overflow: hidden으로 자르면 넓은 표가 잘려 읽을 수 없다.
            // 초점 링도 이 라운드를 따른다.
            borderWidth: 'hairline',
            borderColor: 'ink.border',
            rounded: 'element',
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
    li({ className, children, node, ...props }) {
      const isTaskList = className?.includes('task-list-item');
      const labelId = taskLabelId(node);
      if (isTaskList && labelId) {
        const items = Children.toArray(children);
        const [first, ...content] = items;
        if (!isCheckbox(first)) {
          // 느슨한 목록은 첫 자식이 줄바꿈 텍스트이고 체크박스는 첫 `<p>` 안에 있다.
          const at = items.findIndex(child => isValidElement(child));
          return (
            <li className={className} {...props}>
              {items.map((child, i) =>
                i === at ? labelLooseTask(child, labelId) : child,
              )}
            </li>
          );
        }
        return (
          <li className={className} {...props}>
            {cloneElement(first, { 'aria-labelledby': labelId })}
            <div id={labelId} className={css({ flex: '1', minW: '0' })}>
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
    span({ node: _node, style, className, ...props }) {
      const color =
        typeof style?.color === 'string'
          ? style.color.trim().toLowerCase()
          : '';
      const tokenClass = AUTHOR_COLOR_CLASS[color];
      if (!style || !tokenClass) {
        return <span style={style} className={className} {...props} />;
      }
      const { color: _authored, ...rest } = style;
      return (
        <span style={rest} className={cx(className, tokenClass)} {...props} />
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
      id={POST_CONTENT_ID}
      style={headingOffsetStyle}
      className={css({
        // 서체는 sans다(세리프 정체성은 폐기했다 — serif 토큰도 sans로 매핑돼 있다).
        // 본문은 prose 17/28이고 색은 ink.950이다.
        fontFamily: 'sans',
        textStyle: 'prose',
        color: 'ink.950',
        // 블록 사이 간격은 마진 상쇄에 맡긴다 — 문단·리스트 12, 코드·표·인용 16, 헤딩 위 32.
        // 첫 블록은 위, 마지막 블록은 아래 마진이 없어 본문 상자 밖으로 새지 않는다.
        '& > :first-child': { mt: '0' },
        '& > :last-child': { mb: '0' },
        // 본문 헤딩은 h2(20/28)가 천장이다 — 글 제목(display1)보다 클 수 없다. h3·h4는 본문과 같은
        // 17px이라 크기가 아니라 굵기(600)와 위 여백이 가르고, h4만 한 단계 옅다(ink.700). 따로
        // 고른 포인트색이 없어(blog-preset accent) 색으로는 위계를 내지 않는다.
        //
        // `& h1` 규칙은 없다 — 본문 h1은 렌더 시 h2로 강등되므로
        // (markdownHeadings.tsx) 이 컨테이너 안에 h1이 나올 수 없다.
        // 페이지의 h1은 PostHeader의 글 제목 하나뿐이다.
        '& h2': {
          textStyle: 'h2',
          mt: '8',
          mb: '3',
          color: 'ink.950',
          scrollMarginTop: '[var(--post-heading-offset)]',
        },
        '& h3': {
          textStyle: 'h3',
          mt: '6',
          mb: '3',
          color: 'ink.950',
          scrollMarginTop: '[var(--post-heading-offset)]',
        },
        '& h4': {
          textStyle: 'h3',
          mt: '4',
          mb: '2',
          color: 'ink.700',
          scrollMarginTop: '[var(--post-heading-offset)]',
        },
        '& p': { my: '3' },
        '& ul': { listStyleType: 'disc', pl: '6', my: '3' },
        '& ol': { listStyleType: 'decimal', pl: '6', my: '3' },
        '& li': { my: '1' },
        '& li > ul': { mt: '1', mb: '0' },
        '& li.task-list-item > div > ul': { mt: '1', mb: '0' },
        '& li.task-list-item': {
          listStyleType: 'none',
          pl: '0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '3',
        },
        '& li.task-list-item input[type="checkbox"]': {
          mt: '1.5',
          cursor: 'default',
          accentColor: '[token(colors.accent.solid)]',
          boxSize: '4',
        },
        '& del': { color: 'ink.500' },
        // 제목 안 인라인 코드는 둘러싼 제목 글자를 따른다 — 고정 14px(CodeBlock의 인라인 분기)이면
        // 20px·17px 제목 안에서 코드만 작아진다. 본문 문단 안 코드는 14px 그대로다. 규칙의
        // 명시도(클래스 + 요소 둘)가 CodeBlock의 단일 클래스를 이긴다. strictTokens 밖 값이라
        // 대괄호로 적는다(`prefer-token`은 fontSizes를 검사하지 않는다).
        '& :is(h2, h3, h4) code': { fontSize: '[0.9em]' },
        // 인라인 코드 스타일은 CodeBlock의 인라인 분기가 전담한다.
        // ReactMarkdown의 code 매퍼가 모든 <code>를 CodeBlock으로
        // 보내고 CodeBlock이 항상 클래스를 붙이므로, 여기에
        // `& code:not([class])` 규칙을 두면 절대 매칭되지 않는다.
        // 인용은 Dialogue와 같은 2px 좌측 바로 통일한다(강조 보더 + 보조 잉크).
        '& blockquote': {
          borderLeftWidth: '[2px]',
          borderLeftColor: 'ink.borderStrong',
          pl: '4',
          my: '4',
          color: 'ink.700',
          '& p': { my: '0' },
          '& p + p': { mt: '3' },
        },
        // 본문에서 비켜둔 보조 설명(측정 방법론·재현 환경 고지 등)을 접어두는 블록.
        // 펼침 애니메이션은 ::details-content의 block-size를 0 ↔ auto로 전환한다.
        // auto 보간에 필요한 interpolate-size는 panda.config.ts globalCss의 html에 있고,
        // 미지원 브라우저는 애니메이션 없이 즉시 펼쳐진다(기능 손실 없음).
        '& details': {
          my: '4',
          borderWidth: 'hairline',
          borderColor: 'ink.border',
          rounded: 'container',
          // 면을 깔지 않는다 — 인라인 코드 칩과 코드 블록이 paper.100(다크 #14171c)이라 같은 면 위에서는 지워진다.
          bg: 'transparent',
          px: '4',
        },
        '& details > summary': {
          ...pressToggle,
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
          _hover: { color: 'ink.900' },
          // Safari의 기본 삼각형 마커 제거 — 아래 ::before로 대체한다
          '&::-webkit-details-marker': { display: 'none' },
          '&::before': {
            content: '"▸"',
            display: 'inline-block',
            flexShrink: '0',
            color: 'ink.500',
            // 펼침(아래 details-content)과 같은 시간이라 표식이 내용과 함께 돈다.
            transition: 'transform',
            transitionDuration: 'fastMax',
          },
        },
        '& details[open] > summary::before': {
          transform: '[rotate(90deg)]',
        },
        '& details::details-content': {
          blockSize: '[0]',
          overflow: 'hidden',
          transitionProperty: 'block-size, content-visibility',
          transitionDuration: 'fastMax',
          transitionTimingFunction: 'standard',
          transitionBehavior: 'allow-discrete',
        },
        '& details[open]::details-content': { blockSize: '[auto]' },
        // 접힌 영역 안쪽 여백 정리 — 첫 요소는 summary에 붙고 마지막은 아래 여백만
        '& details > summary + *': { mt: '0' },
        '& details > *:last-child': { mb: '4' },
        // 본문 이미지 모양은 MarkdownImage가 단일 출처다 — 여기 `& img`를 두면 명시도로 이긴다.
        '& hr': {
          my: '6',
          h: '[1px]',
          border: '[none]',
          bg: 'ink.border',
        },
        // 표는 래퍼(table 매퍼)가 보더·라운드·스크롤을 쥐고, 표 자신은 보더가 없다. 칸 사이는
        // 세로선(왼쪽 보더)과 행 사이 가로선(위쪽 보더)뿐이라 바깥 테두리는 래퍼 하나다.
        // 상하 여백도 래퍼가 가진다 — 여기서도 주면 겹쳐 표 앞뒤가 두 배로 벌어진다.
        '& table': {
          w: 'full',
          borderCollapse: 'collapse',
          textStyle: 'prose',
        },
        // 머리 칸은 14/20 600 보조 잉크 — 본문 칸(17/28)보다 작아 머리가 데이터 위에 얹힌다.
        '& th': {
          textStyle: 'h4',
          textAlign: 'left',
          color: 'ink.700',
          px: '3',
          py: '2',
          borderBottomWidth: 'hairline',
          borderColor: 'ink.border',
        },
        '& td': {
          px: '3',
          py: '2',
          color: 'ink.950',
          borderColor: 'ink.border',
        },
        '& th + th': { borderLeftWidth: 'hairline' },
        '& td + td': { borderLeftWidth: 'hairline' },
        '& tbody tr + tr td': { borderTopWidth: 'hairline' },
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
