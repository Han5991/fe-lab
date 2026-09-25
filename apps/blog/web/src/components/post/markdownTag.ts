import { isValidElement, type ReactElement } from 'react';
import { isRecord } from '@blog/content';

/**
 * 요소가 마크다운의 `tag` 태그에서 왔는가. 매핑된 태그는 `type`이 매퍼 함수라,
 * react-markdown이 넘기는 원본 hast 노드의 `tagName`을 함께 본다.
 */
export function isMarkdownTag<P extends object>(
  node: unknown,
  tag: string,
): node is ReactElement<P & { node?: unknown }> {
  if (!isValidElement<{ node?: unknown }>(node)) return false;
  if (node.type === tag) return true;
  const source = node.props.node;
  return isRecord(source) && source['tagName'] === tag;
}
