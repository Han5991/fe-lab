import { isValidElement, type ReactElement, type ReactNode } from 'react';

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

// 직접 매핑돼(`callout: Callout`) child.type으로 식별 가능한 블록 컴포넌트.
//
// 컨테이너 안에서만 쓰는 자식 태그(Msg/Metric/Step, DiagramNodeTag/
// DiagramEdgeTag)도 **함께 등록한다.** "컨테이너 안이라 <p> 직계 자식으로 올 일이
// 없다"는 예전 가정은 틀렸다 — 컨테이너 안에 빈 줄을 두면
// `<step title="…">…</step>` 한 줄은 HTML 블록이 아니라 인라인 HTML을 품은
// **문단**이 된다(여는 태그 뒤에 내용이 이어져 CommonMark HTML 블록 7의 조건을
// 못 채운다). 컨테이너는 그 문단 래퍼를 `markdownChildren`으로 벗겨 내지만,
// 컨테이너 밖에 흘린 자식 태그는 여기서 블록으로 잡아야 `<p><div>`가 안 난다.
// (다이어그램 선언 태그는 아무것도 그리지 않지만, 판정을 "매핑된 커스텀 태그
// 전부"로 두면 새 태그를 더할 때 고를 필요가 없다.)
//
// 원소 타입이 `ElementType`이 아니라 **`ReactElement['type']`**인 건 조회하는
// 값에 맞춘 것이다. 둘은 문자열 쪽이 다르다 — `ElementType`은
// `keyof JSX.IntrinsicElements`(태그명 리터럴 유니온)라 임의의 `string`을 받지
// 않고, `ReactElement['type']`은 `string | JSXElementConstructor<any>`다. 전자로
// 두면 `has(child.type)`마다 인자를 캐스트해야 한다.
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
