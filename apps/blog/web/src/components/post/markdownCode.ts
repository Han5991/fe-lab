import { isValidElement, type ReactNode } from 'react';

/**
 * code 자식의 텍스트만 안전하게 뽑는다. rehypeRaw가 raw HTML <code>에 자식 엘리먼트를
 * 실어 보내면(예: <code><span>x</span></code>) children이 문자열이 아니라 엘리먼트(배열)가
 * 되는데, String(children)은 '[object Object]', 단순 문자열 가드는 ''로 내용을 잃는다.
 */
export function codeText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(codeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node))
    return codeText(node.props.children);
  return '';
}

/**
 * react-markdown의 code 요소가 "블록 코드블록"인지 판별하는 단일 기준.
 *
 * CodeBlock(렌더)과 isBlockMarkdownChild(<p>/<div> 래퍼 결정)가 **반드시 같은 함수**를
 * 써야, 언어 태그 없는 fenced 블록이 한쪽에선 블록·다른 쪽에선 인라인으로 갈려
 * `<p>` 안에 `<div>`가 들어가는 hydration 오류를 만들지 않는다.
 *
 * 판별: 언어 className이 있거나(fenced+lang), 텍스트가 \n으로 끝나면(fenced) 블록.
 * fenced 블록 텍스트는 react-markdown이 항상 trailing \n으로 끝나게 준다.
 */
export function isBlockCode(children: ReactNode, className?: unknown): boolean {
  if (typeof className === 'string' && /language-(\w+)/.test(className)) {
    return true;
  }
  return codeText(children).endsWith('\n');
}
