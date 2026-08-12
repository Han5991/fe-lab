'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { css } from '@design-system/ui-lib/css';
import { codeText } from '@/src/components/post/markdownCode';
import { CopyButton } from '@/src/components/post/CodeBlock';

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
 * 두 줄로 겹친다. 대신 복사 버튼은 여기서 그리고, 복사 대상은 **지금 열려
 * 있는 탭**의 코드다.
 */

/** `tab="npm"`이 붙은 코드 블록 하나. */
interface TabItem {
  label: string;
  /** 크롬을 끈 코드 블록 엘리먼트. */
  content: ReactElement;
  /** 복사 버튼이 클립보드에 넣을 원문. */
  code: string;
}

type CodeElementProps = {
  'data-tab'?: string;
  children?: ReactNode;
};

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

function collectTabs(children: ReactNode): TabItem[] {
  return Children.toArray(children).flatMap<TabItem>(child => {
    if (!isValidElement(child)) return [];
    const code = unwrapPre(child);
    if (!code) return [];
    const props = code.props as CodeElementProps;
    const label = props['data-tab'];
    // 탭 이름이 없는 블록은 탭이 될 수 없다. 조용히 빠뜨리는 대신 그냥
    // 목록에서 제외하고, 아래에서 탭이 하나도 없으면 원본을 그대로 그린다.
    if (!label) return [];
    return [
      {
        label,
        content: cloneElement(code, { 'data-bare': true } as CodeElementProps),
        code: codeText(props.children).replace(/\n$/, ''),
      },
    ];
  });
}

export function CodeTabs({ children }: { children?: ReactNode }) {
  const items = useMemo(() => collectTabs(children), [children]);
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef(new Map<number, HTMLButtonElement>());

  // 탭 이름을 하나도 못 찾았으면 이 컴포넌트가 할 일이 없다. 글쓴이가
  // `tab=` 을 빠뜨린 경우라, 내용을 숨기지 말고 그대로 흘려보낸다.
  if (items.length === 0) return <>{children}</>;

  const current = items[Math.min(active, items.length - 1)];

  // ←/→ 로 탭을 옮긴다(WAI-ARIA tabs 패턴). 버튼만으로도 Tab 키 순회는
  // 되지만, 탭 목록 안에서는 화살표가 기본 조작이다.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    const next = (active + delta + items.length) % items.length;
    setActive(next);
    tabRefs.current.get(next)?.focus();
  };

  return (
    <div
      className={css({
        mb: '12',
        mt: '8',
        rounded: 'card',
        overflow: 'hidden',
        bg: 'code.surface',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        '&::selection, & ::selection': { bg: 'code.selection' },
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '1',
          bg: 'code.chrome',
          px: '2',
          minH: '[36px]',
          borderBottomWidth: 'hairline',
          borderColor: 'ink.border',
        })}
      >
        <div
          role="tablist"
          // 축을 단정하지 않는다. npm/pnpm/yarn 만 있는 게 아니라
          // Next.js/React Router 처럼 프레임워크로 가르기도 한다.
          aria-label="같은 코드의 다른 버전"
          onKeyDown={onKeyDown}
          className={css({ display: 'flex', overflowX: 'auto', flex: '1' })}
        >
          {items.map((item, i) => {
            const selected = i === active;
            return (
              <button
                // 라벨만으로는 부족하다 — 글쓴이가 같은 이름을 두 번 달면
                // key가 겹쳐 두 번째 탭이 첫 번째와 같은 것으로 취급된다.
                key={`${i}-${item.label}`}
                ref={el => {
                  if (el) tabRefs.current.set(i, el);
                  else tabRefs.current.delete(i);
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${i}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                // 선택되지 않은 탭은 Tab 키 순회에서 빼고 화살표로만 간다.
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                className={css({
                  pos: 'relative',
                  px: '2',
                  py: '2',
                  fontFamily: 'mono',
                  fontSize: 'xs',
                  letterSpacing: 'mono',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  color: selected ? 'accent.600' : 'ink.600',
                  transition: '[color 0.15s]',
                  _hover: { color: selected ? 'accent.600' : 'ink.950' },
                  // 활성 표시는 밑줄 1px. 배경을 칠하면 크롬 안에 또 다른
                  // 상자가 생겨 위계가 한 겹 늘어난다.
                  '&[aria-selected=true]::after': {
                    content: '""',
                    pos: 'absolute',
                    insetX: '2',
                    bottom: '0',
                    h: '[1px]',
                    bg: 'accent.500',
                  },
                })}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <CopyButton content={current.code} />
      </div>
      {/* 패널 → 탭 방향도 걸어야 tabs 패턴이 완성된다. 탭에서 패널로 가는
          aria-controls만 있으면, 패널에 먼저 도착한 스크린리더 사용자는
          이게 어느 탭의 내용인지 알 수 없다. */}
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${items.indexOf(current)}`}
      >
        {current.content}
      </div>
    </div>
  );
}
