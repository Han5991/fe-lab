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
  const { tabs: items, rest } = useMemo(
    () => collectTabs(children),
    [children],
  );
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef(new Map<number, HTMLButtonElement>());

  // 코드 블록이 하나도 없으면 이 컴포넌트가 할 일이 없다. 글쓴이가 태그만
  // 열어 두고 안을 안 채웠거나 빈 줄을 빠뜨린 경우라, 내용을 숨기지 말고
  // 그대로 흘려보낸다.
  if (items.length === 0) return <>{children}</>;

  // active는 0 이상이고 위에서 items.length > 0 을 확인했으므로 인덱스는 항상
  // 범위 안이다. 타입으로는 증명되지 않으니, 못 고르면 위와 같은 폴백을 쓴다.
  const current = items[Math.min(active, items.length - 1)];
  if (!current) return <>{children}</>;

  // ←/→ 로 옮기고 Home/End 로 양 끝으로 간다(WAI-ARIA tabs 패턴). 버튼만
  // 으로도 Tab 키 순회는 되지만, 탭 목록 안에서는 이쪽이 기본 조작이다.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = items.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? (active + 1) % items.length
        : e.key === 'ArrowLeft'
          ? (active + last) % items.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current.get(next)?.focus();
  };

  const box = (
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
                // 화살표 처리는 tablist가 아니라 **탭 자신**이 받는다. 초점은
                // 언제나 탭 버튼에 있고(위 roving tabIndex), tablist는 초점을
                // 받지 않는 컨테이너다 — 거기 키 핸들러를 달면 "초점도 못 받는
                // 요소가 키를 처리한다"가 된다(jsx-a11y/interactive-supports-focus).
                onKeyDown={onKeyDown}
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
                  // 선택 표시는 **무채색**이다. 포인트색이 가는 자리는 제목 ·
                  // 링크 · 시리즈 배지 · 다이어그램의 핵심 경로 넷뿐이고
                  // (CLAUDE.md 디자인 시스템), 탭은 그 어디도 아니다. 차례
                  // 레일이 같은 이유로 무채색인 것과도 맞춘다 — 코드 블록
                  // 크롬처럼 본문을 읽는 보조 장치에까지 액센트를 뿌리면
                  // "액센트가 붙은 곳 = 중요한 곳"이라는 신호가 닳는다.
                  color: selected ? 'ink.950' : 'ink.600',
                  transition: '[color 0.15s]',
                  _hover: { color: 'ink.950' },
                  // 활성 표시는 밑줄 1px. 배경을 칠하면 크롬 안에 또 다른
                  // 상자가 생겨 위계가 한 겹 늘어난다.
                  '&[aria-selected=true]::after': {
                    content: '""',
                    pos: 'absolute',
                    insetX: '2',
                    bottom: '0',
                    h: '[1px]',
                    bg: 'ink.950',
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
