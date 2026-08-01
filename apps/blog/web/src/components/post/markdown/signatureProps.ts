import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

/**
 * 시그니처 컴포넌트(Dialogue / Metrics / Timeline)가 공유하는 방어적 prop 파싱.
 *
 * 이 블로그의 본문은 MDX가 아니라 react-markdown + rehype-raw다. 글에서는
 * `<metrics items='[...]'>` 같은 **raw HTML 커스텀 태그**로 쓰이므로 모든 속성이
 * 문자열로만 들어온다. 반면 JSX(홈·글 상세 템플릿)에서는 배열을 그대로 넘기고 싶다.
 * 두 입력 경로를 여기 한 곳에서 흡수해, 각 컴포넌트는 분기 없이 배열만 다룬다.
 */

/**
 * `items` / `steps` 처럼 "JSON 문자열 또는 실제 배열"로 오는 prop을 배열로 정규화한다.
 *
 * `null`을 돌려주면 호출부는 **children 기반 렌더로 폴백**한다. 글 하나의 JSON 오타
 * 때문에 글 전체가 렌더 실패로 죽으면 안 되므로, 파싱 실패는 throw가 아니라 폴백이다.
 */
export function parseItemsProp<T>(
  value: unknown,
  isItem: (candidate: unknown) => candidate is T,
): T[] | null {
  if (value === undefined || value === null) return null;

  const raw = typeof value === 'string' ? parseJsonOrNull(value) : value;
  if (!Array.isArray(raw)) return null;

  const items = raw.filter(isItem);
  // 전부 걸러졌다면(형태가 어긋난 JSON) 빈 카드 껍데기를 그리는 대신 폴백한다.
  return items.length > 0 ? items : null;
}

function parseJsonOrNull(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/** 문자열 키만 뽑는 헬퍼 — raw HTML 속성은 전부 문자열이라 타입 가드가 얇아도 된다. */
export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * "없거나 문자열"인지 검사한다. 타입 가드가 **읽지 않는 필드까지** 확인해야 하는
 * 이유가 있다.
 *
 * `items` / `steps`의 JSON은 저자가 손으로 쓴다. 문법은 맞지만 필드 타입이 틀린
 * 값(`{"label":"a","value":{"nested":true}}`)이 오면, "label만 문자열이면 통과"
 * 같은 느슨한 가드는 이걸 통과시킨다. 그 객체는 그대로 JSX 자식이 되고 React가
 * "Objects are not valid as a React child"로 throw한다. 본문을 감싸는 에러
 * 바운더리가 없어 글 페이지 전체가 죽는다.
 *
 * `parseItemsProp`은 가드를 통과 못 한 아이템을 걸러내고, 전부 걸러지면 children
 * 폴백으로 떨어진다. 즉 가드를 촘촘히 할수록 "조용히 폴백"이 되고, 느슨하면
 * "페이지 크래시"가 된다.
 */
export function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

/**
 * react-markdown이 커스텀 태그 사이에 끼워 넣는 **공백 전용 텍스트 노드**를 걷어내고
 * 의미 있는 자식만 순서대로 돌려준다.
 *
 * `<timeline>` 과 `<step>` 을 줄바꿈해서 쓰면 그 사이 개행이 텍스트 노드로 들어와,
 * 필터가 없으면 "자식 개수"와 `:last-child` 판정이 통째로 어긋난다.
 * 마크다운이 자식을 문단으로 감싼 경우(`<p>`)도 한 겹 벗겨낸다.
 *
 * 언랩 과정에서 키가 겹치지 않도록 경로 기반 키를 다시 부여한다.
 */
export function markdownChildren(children: ReactNode): ReactNode[] {
  const collected: ReactNode[] = [];
  collectChildren(children, '', collected);
  return collected;
}

function collectChildren(
  children: ReactNode,
  prefix: string,
  out: ReactNode[],
): void {
  Children.toArray(children).forEach((child, index) => {
    const key = `${prefix}${index}`;

    if (typeof child === 'string') {
      if (child.trim().length === 0) return;
      out.push(child);
      return;
    }

    if (isParagraphWrapper(child)) {
      collectChildren(child.props.children, `${key}-`, out);
      return;
    }

    if (isValidElement(child)) {
      out.push(cloneElement(child, { key }));
      return;
    }

    out.push(child);
  });
}

function isParagraphWrapper(
  node: ReactNode,
): node is ReactElement<{ children?: ReactNode }> {
  return isValidElement<{ children?: ReactNode }>(node) && node.type === 'p';
}
