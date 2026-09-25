import { isValidElement, type ReactElement } from 'react';
import { isRecord } from '@blog/content';

/**
 * 요소가 마크다운의 `tag` 태그에서 왔는가.
 *
 * 본문 파이프라인(PostBody)은 `p`·`pre`·`img` 같은 태그를 함수로 매핑하므로 실제
 * 글에서 그 요소의 `type`은 태그 문자열이 아니라 매퍼다. react-markdown이 매핑된
 * 컴포넌트에 넘기는 원본 hast 노드(`props.node`)의 `tagName`을 함께 본다 —
 * 매핑 없이 JSX로 쓴 요소(`type === tag`)도 받는다.
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
