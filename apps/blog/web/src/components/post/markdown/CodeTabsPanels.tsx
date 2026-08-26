'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';
import { CopyButton } from '@/src/components/post/CopyButton';

/** 탭 메타 — 파서(CodeTabs)가 자식 훑기를 마치고 넘겨주는 직렬화 가능한 값. */
export interface CodeTabMeta {
  label: string;
  /** 복사 버튼이 클립보드에 넣을 원문. */
  code: string;
}

/**
 * `<code-tabs>`의 **상호작용 절반** — 탭 상태·키보드 조작·복사 버튼.
 *
 * 자식 훑기는 여기서 하지 않는다(파서인 CodeTabs.tsx 주석 참고). 이 컴포넌트가
 * 받는 것은 이미 파싱이 끝난 값들뿐이다: 라벨·복사 원문(`tabs`)과, 크롬을 끈
 * 코드 블록 렌더 결과(`panels`, `tabs`와 같은 인덱스). DOM에는 열려 있는
 * 패널 하나만 둔다 — 전부 그려 두고 숨기면 산출 HTML이 탭 수만큼 붇는다.
 */
export function CodeTabsPanels({
  tabs,
  panels,
}: {
  tabs: CodeTabMeta[];
  panels: ReactNode[];
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef(new Map<number, HTMLButtonElement>());

  // active는 0 이상이고 파서가 빈 목록이면 이 컴포넌트를 만들지 않는다.
  // 타입으로는 증명되지 않으니 인덱스는 잘라서 쓰고, 못 고르면 그리지 않는다.
  const activeIndex = Math.min(active, tabs.length - 1);
  const current = tabs[activeIndex];
  if (!current) return null;

  // ←/→ 로 옮기고 Home/End 로 양 끝으로 간다(WAI-ARIA tabs 패턴). 버튼만
  // 으로도 Tab 키 순회는 되지만, 탭 목록 안에서는 이쪽이 기본 조작이다.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? (activeIndex + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (activeIndex + last) % tabs.length
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
          className={css({ display: 'flex', overflowX: 'auto', flex: '1' })}
        >
          {tabs.map((item, i) => {
            const selected = i === activeIndex;
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
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
      >
        {panels[activeIndex]}
      </div>
    </div>
  );
}
