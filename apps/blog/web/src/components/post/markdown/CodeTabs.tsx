import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { codeText } from '@/src/components/post/markdownCode';
import { CodeTabsPanels, type CodeTabMeta } from './CodeTabsPanels';

/**
 * 같은 내용을 도구별로 보여주는 코드 탭 — `npm` / `pnpm` / `yarn` 처럼.
 *
 * 글에서는 다른 커스텀 태그와 똑같이 raw HTML로 쓰고, 탭 이름은 **펜스
 * 메타**에 단다. 열고 닫는 태그 사이에 빈 줄을 둬야 안쪽이 마크다운으로
 * 파싱된다(HTML 블록 규칙 — `<callout>`과 같다).
 *
 * ```html
 * <code-tabs>
 *
 * ```bash tab="npm"
 * npm i typesense
 * ```
 *
 * ```bash tab="pnpm"
 * pnpm add typesense
 * ```
 *
 * </code-tabs>
 * ```
 *
 * 상단 바는 **탭이 통째로 가져간다.** 자식 코드 블록은 `data-bare`로
 * 자기 크롬(언어 라벨·보더·라운드)을 끄고 코드만 그린다 — 안 그러면 바가
 * 두 줄로 겹친다. 대신 복사 버튼은 탭 바에서 그리고, 복사 대상은 **지금 열려
 * 있는 탭**의 코드다.
 *
 * 이 모듈은 **파싱만** 한다 — 자식 요소 트리를 훑는 일은 렌더 전의 요소
 * 디스크립터가 있어야 해서 마크다운이 컴파일되는 쪽(서버)의 일이고,
 * 탭 상태·키보드 조작은 CodeTabsPanels(클라이언트)가 진다. 클라이언트에서
 * 자식을 훑을 수는 없다: 서버가 렌더를 마친 children은 이미 `<figure>`로
 * 펼쳐져 있어 `data-tab`·`className`이 남아 있지 않다.
 */

/** 탭 하나가 된 코드 블록. */
interface TabItem {
  label: string;
  /** 크롬을 끈 코드 블록 엘리먼트. */
  content: ReactElement;
  /** 복사 버튼이 클립보드에 넣을 원문. */
  code: string;
}

/** 자식을 훑은 결과. `rest`는 탭이 될 수 없어 그대로 흘려보낼 것들. */
interface Collected {
  tabs: TabItem[];
  rest: ReactNode[];
}

interface CodeElementProps {
  'data-tab'?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * fenced code는 `<pre><code/></pre>`로 오므로 한 겹 벗긴다.
 *
 * `pre`를 그대로 두면 안에 들어갈 `<figure>`가 phrasing content만 받는
 * `<pre>` 안에 놓여 무효 중첩이 된다. 어차피 코드 블록의 상자는 CodeBlock이
 * 직접 그리므로 래퍼는 필요 없다.
 */
function unwrapPre(node: ReactElement): ReactElement | null {
  if (node.type !== 'pre') return node;
  const inner = Children.toArray(
    (node.props as { children?: ReactNode }).children,
  ).find(isValidElement);
  return inner ?? null;
}

/**
 * 자식을 탭이 될 것과 아닌 것으로 가른다.
 *
 * **어느 쪽도 버리지 않는 게 이 함수의 계약이다.** 처음에는 `tab=`이 붙은
 * 블록만 모으고 나머지는 그냥 흘려보냈는데, 그러면 탭이 하나라도 만들어진
 * 순간 이름 없는 자식들이 화면에서 통째로 사라졌다. 셋 중 하나에만 `tab=`을
 * 빠뜨리는 건 흔한 실수인데 에러도 경고도 없이 그 코드만 없어지니, 글쓴이가
 * 발행 후에야 알아채게 된다.
 *
 * 그래서 **코드 펜스는 이름이 없어도 탭이 된다**(언어명 → 순번 순으로 이름을
 * 짓는다). 코드가 아닌 자식(문단, 이미지…)은 탭이 될 수 없으니 `rest`로
 * 넘겨 탭 상자 **아래에** 그대로 그린다. 자리가 어색해 보이는 건 글쓴이가
 * 고칠 수 있지만, 안 보이는 건 고칠 수가 없다.
 */
function collectTabs(children: ReactNode): Collected {
  const tabs: TabItem[] = [];
  const rest: ReactNode[] = [];

  Children.toArray(children).forEach(child => {
    // 코드 펜스는 언제나 `<pre>`로 온다. raw HTML로 직접 쓴 <pre>도 같은
    // 취급이지만, 그건 어차피 코드를 담는 상자라 탭에 들어가도 무방하다.
    const code =
      isValidElement(child) && child.type === 'pre' ? unwrapPre(child) : null;
    if (!code) {
      // 마크다운이 블록 사이에 끼워 넣는 공백 텍스트까지 남기면 탭 아래에
      // 빈 줄이 생긴다. 그것만 걸러내고 나머지는 전부 보존한다.
      if (typeof child === 'string' && child.trim() === '') return;
      rest.push(child);
      return;
    }

    const props = code.props as CodeElementProps;
    const language = /language-(\w+)/.exec(props.className ?? '')?.[1];
    tabs.push({
      label: props['data-tab'] ?? language ?? `코드 ${tabs.length + 1}`,
      content: cloneElement(code, { 'data-bare': true } as CodeElementProps),
      code: codeText(props.children).replace(/\n$/, ''),
    });
  });

  return { tabs, rest };
}

export function CodeTabs({ children }: { children?: ReactNode }) {
  const { tabs, rest } = collectTabs(children);

  // 코드 블록이 하나도 없으면 이 컴포넌트가 할 일이 없다. 글쓴이가 태그만
  // 열어 두고 안을 안 채웠거나 빈 줄을 빠뜨린 경우라, 내용을 숨기지 말고
  // 그대로 흘려보낸다.
  if (tabs.length === 0) return <>{children}</>;

  const box = (
    <CodeTabsPanels
      tabs={tabs.map(({ label, code }): CodeTabMeta => ({ label, code }))}
      panels={tabs.map(tab => tab.content)}
    />
  );

  // 탭이 될 수 없었던 자식은 상자 **밖 아래**에 그대로 붙인다. 코드 표면
  // 위에 문단을 얹으면 배경이 어긋나고, 상자 안에 감추면 안 보인다.
  return rest.length === 0 ? (
    box
  ) : (
    <>
      {box}
      {rest}
    </>
  );
}
