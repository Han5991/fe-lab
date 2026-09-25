import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  Diagram,
  DiagramEdgeTag,
  DiagramNodeTag,
} from '@/src/components/diagram';
import { Callout } from '@/src/components/post/markdown/Callout';
import { CodeTabs } from '@/src/components/post/markdown/CodeTabs';
import { Dialogue, Msg } from '@/src/components/post/markdown/Dialogue';
import { Figure } from '@/src/components/post/markdown/Figure';
import { FileTree } from '@/src/components/post/markdown/FileTree';
import { Metric, Metrics } from '@/src/components/post/markdown/Metrics';
import { Step, Timeline } from '@/src/components/post/markdown/Timeline';
import { isBlockCode } from '@/src/components/post/markdownCode';
import { isMarkdownTag } from '@/src/components/post/markdownTag';

// 직접 매핑돼 child.type으로 가리는 블록 컴포넌트 — 매핑된 커스텀 태그 전부다.
// 자식 태그(Msg·Step·DiagramNodeTag…)도 넣는다: 빈 줄 뒤 자식 태그는 문단에 싸여
// 와서, 컨테이너 밖에 흘리면 `<p><div>`가 된다. 원소 타입이 `ReactElement['type']`인
// 건 `has(child.type)`에 캐스트가 필요 없어서다.
export const BLOCK_MARKDOWN_COMPONENTS = new Set<ReactElement['type']>([
  Callout,
  CodeTabs,
  Diagram,
  DiagramEdgeTag,
  DiagramNodeTag,
  Dialogue,
  Figure,
  FileTree,
  Metric,
  Metrics,
  Msg,
  Step,
  Timeline,
]);

// <p> 안에 블록 요소가 들어가면 무효 중첩(<p><div></div></p>)이 되어 브라우저가
// <p>를 조기 종료 → hydration mismatch. 직접 매핑된 블록은 identity로, 인라인
// 래퍼(img/code)를 거치는 것은 공개 prop으로 식별한다(react-markdown 내부 node 비의존).
export function isBlockMarkdownChild(child: unknown): boolean {
  // children을 `unknown`이 아니라 `ReactNode`로 적는다. `isValidElement<P>`의 P는
  // 어차피 검증되지 않는 주장이므로 `unknown`으로 둔 뒤 캐스트해도 안전해지는 게
  // 아니고, 실제로 여기 오는 값은 엘리먼트의 children이며 `isBlockCode`가 받는
  // 타입도 그것이다 — 주장을 한 번만 하고 캐스트를 없앤다.
  if (
    !isValidElement<{ className?: string; src?: string; children?: ReactNode }>(
      child,
    )
  )
    return false;
  if (BLOCK_MARKDOWN_COMPONENTS.has(child.type)) return true;
  const { className, src, children } = child.props;
  // img → MarkdownImage가 <Zoom>의 블록 <div>를 렌더하므로 <p>에 둘 수 없다.
  if (typeof src === 'string') return true;
  // 인라인/fenced code는 같은 핸들러(CodeBlock)를 거치므로, 블록 판별도 CodeBlock과
  // 똑같이 isBlockCode로 위임한다. 두 곳이 기준이 갈리면(언어 className 정규식이나, 문자열이
  // 아닌 raw HTML <code> children 처리) 한쪽은 <p> 유지·다른 쪽은 <div> 렌더가 되어
  // <p> 안에 <div>가 들어가는 hydration mismatch가 난다.
  return isBlockCode(children, className);
}

interface CodeElementProps {
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * `pre`의 자식이 CodeBlock이 블록으로 그릴 코드 하나뿐이면 그 요소. 판정은 CodeBlock과
 * 같은 `isBlockCode`다 — 갈리면 벗긴 자리에 인라인 code가 남거나 `<pre>` 안에 figure가 든다.
 */
export function fencedCode(
  children: ReactNode,
): ReactElement<CodeElementProps> | null {
  const nodes = Children.toArray(children).filter(
    child => !(typeof child === 'string' && child.trim() === ''),
  );
  const [only] = nodes;
  return nodes.length === 1 &&
    isMarkdownTag<CodeElementProps>(only, 'code') &&
    isBlockCode(only.props.children, only.props.className)
    ? only
    : null;
}
