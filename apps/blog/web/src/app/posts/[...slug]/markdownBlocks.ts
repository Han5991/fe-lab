import { isValidElement, type ElementType } from 'react';

import { Callout } from '@/src/components/post/markdown/Callout';
import { Figure } from '@/src/components/post/markdown/Figure';
import { FileTree } from '@/src/components/post/markdown/FileTree';

// 직접 매핑돼(`callout: Callout`) child.type으로 식별 가능한 블록 컴포넌트.
const BLOCK_MARKDOWN_COMPONENTS = new Set<ElementType>([
  Callout,
  Figure,
  FileTree,
]);

// <p> 안에 블록 요소가 들어가면 무효 중첩(<p><div></div></p>)이 되어 브라우저가
// <p>를 조기 종료 → hydration mismatch. 직접 매핑된 블록은 identity로, 인라인
// 래퍼(img/code)를 거치는 것은 공개 prop으로 식별한다(react-markdown 내부 node 비의존).
export function isBlockMarkdownChild(child: unknown): boolean {
  if (!isValidElement<{ className?: string; src?: string }>(child))
    return false;
  if (BLOCK_MARKDOWN_COMPONENTS.has(child.type as ElementType)) return true;
  const { className, src } = child.props;
  // img → MarkdownImage가 <Zoom>의 블록 <div>를 렌더하므로 <p>에 둘 수 없다.
  if (typeof src === 'string') return true;
  // 인라인/fenced code는 같은 핸들러라 language-* className으로만 구분된다.
  return typeof className === 'string' && /\blanguage-/.test(className);
}
