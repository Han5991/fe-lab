import { isValidElement, type ElementType, type ReactNode } from 'react';

import { Diagram } from '@/src/components/diagram';
import { Callout } from '@/src/components/post/markdown/Callout';
import { CodeTabs } from '@/src/components/post/markdown/CodeTabs';
import { Dialogue } from '@/src/components/post/markdown/Dialogue';
import { Figure } from '@/src/components/post/markdown/Figure';
import { FileTree } from '@/src/components/post/markdown/FileTree';
import { Metrics } from '@/src/components/post/markdown/Metrics';
import { Timeline } from '@/src/components/post/markdown/Timeline';
import { isBlockCode } from '@/src/components/post/markdownCode';

// 직접 매핑돼(`callout: Callout`) child.type으로 식별 가능한 블록 컴포넌트.
// 시그니처 3종(Dialogue/Metrics/Timeline)은 최상위 컨테이너만 등록한다 —
// Msg/Metric/Step은 컨테이너 안에서만 쓰이므로 <p> 직계 자식으로 올 일이 없다.
// Diagram도 같은 이유로 컨테이너만 등록한다(DiagramNodeTag/DiagramEdgeTag는
// <diagram> 안에서 좌표 계산용 메타로만 소비되어 DOM에 직접 나오지 않는다).
export const BLOCK_MARKDOWN_COMPONENTS = new Set<ElementType>([
  Callout,
  CodeTabs,
  Diagram,
  Dialogue,
  Figure,
  FileTree,
  Metrics,
  Timeline,
]);

// <p> 안에 블록 요소가 들어가면 무효 중첩(<p><div></div></p>)이 되어 브라우저가
// <p>를 조기 종료 → hydration mismatch. 직접 매핑된 블록은 identity로, 인라인
// 래퍼(img/code)를 거치는 것은 공개 prop으로 식별한다(react-markdown 내부 node 비의존).
export function isBlockMarkdownChild(child: unknown): boolean {
  if (
    !isValidElement<{ className?: string; src?: string; children?: unknown }>(
      child,
    )
  )
    return false;
  if (BLOCK_MARKDOWN_COMPONENTS.has(child.type as ElementType)) return true;
  const { className, src, children } = child.props;
  // img → MarkdownImage가 <Zoom>의 블록 <div>를 렌더하므로 <p>에 둘 수 없다.
  if (typeof src === 'string') return true;
  // 인라인/fenced code는 같은 핸들러(CodeBlock)를 거치므로, 블록 판별도 CodeBlock과
  // 똑같이 isBlockCode로 위임한다. 두 곳이 기준이 갈리면(언어 className 정규식이나, 문자열이
  // 아닌 raw HTML <code> children 처리) 한쪽은 <p> 유지·다른 쪽은 <div> 렌더가 되어
  // <p> 안에 <div>가 들어가는 hydration mismatch가 난다.
  return isBlockCode(children as ReactNode, className);
}
