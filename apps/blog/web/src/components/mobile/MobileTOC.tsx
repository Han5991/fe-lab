'use client';

import { useId, useRef } from 'react';
import { List, X } from 'lucide-react';
import { css, cva, sva } from '@blog/styled-system/css';
import type { RecipeVariant } from '@blog/styled-system/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';
import { isModifiedClick } from '@/src/components/events';
import { Portal } from '@/src/components/Portal';
import { iconButton } from '@/src/components/iconButton';
import {
  holdAnimationWhileFocused,
  pressFab,
  pressText,
} from '@/src/components/interaction';
import { useModalDialog } from '@/src/components/useModalDialog';
import { usePresence } from '@/src/components/usePresence';

/** 목차 항목 한 줄 — level은 헤딩 깊이만큼 들여쓰고, active는 현재 절을 비춘다. */
const tocItem = cva({
  base: {
    ...pressText,
    // 앵커가 인라인이면 글자 폭만 눌리는 자리가 된다. li 한 줄 전체가
    // 탭 대상이었던 예전 동작을 유지하려면 블록이어야 한다.
    display: 'block',
    fontSize: 'md',
    cursor: 'pointer',
    _hover: { color: 'accent.solid' },
  },
  variants: {
    level: {
      1: { pl: '0' },
      2: { pl: '2' },
      3: { pl: '4' },
      4: { pl: '6' },
    },
    active: {
      true: { fontWeight: 'bold', color: 'accent.solid' },
      false: { fontWeight: 'medium', color: 'ink.600' },
    },
  },
  defaultVariants: { level: 1, active: false },
});

// RecipeVariant의 variant prop은 optional이라 exactOptionalPropertyTypes에서는
// undefined가 유니언에 남는다 — 값 타입으로 쓰는 여기서는 걷어낸다.
type TocLevel = NonNullable<RecipeVariant<typeof tocItem>['level']>;

// variantMap의 값은 런타임에 Object.keys 산물이라 문자열이다 — 숫자 level과
// 비교하려면 되돌려야 한다.
const isTocLevel = (level: number): level is TocLevel =>
  tocItem.variantMap.level.map(Number).includes(level);

/**
 * 목차 버튼(FAB)의 상자 — 시트가 이 자리에서 펼쳐지고 접힌다. 버튼과 시트의 시작·끝 모양(clip-path)이 같은
 * 값에서 나오도록 한 곳에 둔다. 시트는 아래·좌우가 화면 끝에 붙어 있어서 시트 상자 안의 버튼 위치가 고정이고,
 * `inset()`의 퍼센트가 시트 상자 기준이라 시트 높이가 내용에 따라 달라져도 측정이 필요 없다.
 */
const FAB = { bottom: '20', right: '6', size: '12' } as const;

/** 접힌 모양 — FAB 원. 시트 상자 안에서 버튼이 선 자리와 크기다. */
const CLIP_FAB = `[inset(calc(100% - token(spacing.${FAB.bottom}) - token(spacing.${FAB.size})) token(spacing.${FAB.right}) token(spacing.${FAB.bottom}) calc(100% - token(spacing.${FAB.right}) - token(spacing.${FAB.size})) round calc(token(spacing.${FAB.size}) / 2))]`;
/** 펼친 모양 — 시트 상자 전체, 위 모서리만 둥글다. */
const CLIP_SHEET =
  '[inset(0 round token(radii.container) token(radii.container) 0 0)]';

/**
 * 시트의 여섯 면 — 전부 같은 규칙이다: 기본 값이 **닫힌 모양**(= 닫힘 전환의 목표)이고,
 * `data-state="open"`이 펼친 모양 + `@starting-style`(마운트 직후의 출발값)이다. 중간에 상태가 바뀌면
 * CSS 전환이 지금 값에서 되돌아가고(시간도 진행한 만큼만 쓴다) 새 `@keyframes`는 없다.
 *
 * 지원: `@starting-style`이 없는 브라우저(Safari 17.5 미만)에서는 열림이 즉시다 — 지난 슬라이드도 같은
 * 조건이었다. 움직임 줄이기는 시간 토큰이 0.01ms로 바꾼다.
 */
const sheetParts = sva({
  slots: ['scrim', 'wrap', 'sheet', 'content', 'face'],
  base: {
    // 백드롭은 시트용 scrim이다. 예전엔 ink.950을 반투명으로 깔아, 잉크가 밝아지는 다크에서 백드롭이 지면을
    // 밝히는 회색 막이 됐다 — scrim은 테마와 무관하게 어둡다. 백드롭 클릭은 포인터 편의다 — 키보드는
    // Escape·닫기 버튼으로 닫는다(검색 다이얼로그와 같다).
    scrim: {
      pos: 'fixed',
      inset: '0',
      bg: 'scrim.sheet',
      zIndex: '50',
      opacity: '0',
      // 거리 없는 퇴장 페이드라 linear — 감속 곡선이면 시트가 아직 접히는 동안 스크림이 먼저 걷힌다.
      transitionProperty: 'opacity',
      transitionDuration: 'fast',
      transitionTimingFunction: 'linear',
      '&[data-state=open]': {
        opacity: '1',
        transitionDuration: 'medium',
        _starting: { opacity: '0' },
      },
    },
    // 감싸개는 잘리지 않는다 — 그림자는 감싸개의 ::before 판이 들고, 모핑이 끝난 뒤(medium 뒤) 붙는다.
    // 시트 자신에 box-shadow를 두면 clip-path가 그림자까지 자른다. 떠 있는 표면이라 overlay.high
    // (AGENTS.md §9). 다크에서는 그림자가 scrim 위에서 거의 보이지 않으므로 시트의 위 hairline이 경계를 맡는다.
    wrap: {
      pos: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      zIndex: '51',
      display: 'flex',
      flexDir: 'column',
      maxH: '[70vh]',
      _before: {
        content: '""',
        pos: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        roundedTop: 'container',
        boxShadow: 'overlay.high',
        // 붙을 때만 전환하고 뗄 때는 즉시다 — 접히는 시트가 그림자를 끌고 다니지 않는다.
        opacity: '0',
      },
      '&[data-state=open]::before': {
        opacity: '1',
        transitionProperty: 'opacity',
        transitionDuration: 'fast',
        transitionTimingFunction: 'standard',
        transitionDelay: 'medium',
        _starting: { opacity: '0' },
      },
    },
    sheet: {
      pos: 'relative',
      flex: '1',
      minH: '0',
      display: 'flex',
      flexDir: 'column',
      bg: 'paper.50',
      roundedTop: 'container',
      borderTopWidth: 'hairline',
      borderColor: 'ink.border',
      pb: '[env(safe-area-inset-bottom)]',
      clipPath: CLIP_FAB,
      transitionProperty: 'clip-path',
      transitionDuration: 'fast',
      transitionTimingFunction: 'exit',
      '&[data-state=open]': {
        clipPath: CLIP_SHEET,
        transitionDuration: 'medium',
        transitionTimingFunction: 'standard',
        _starting: { clipPath: CLIP_FAB },
      },
    },
    // 내용은 시트가 펼쳐진 뒤(fast 지연)에 나타나고, 접힐 때는 곧바로 걷힌다 — 지연은 열림 규칙에만 둔다.
    content: {
      display: 'flex',
      flexDir: 'column',
      flex: '1',
      minH: '0',
      opacity: '0',
      transitionProperty: 'opacity',
      transitionDuration: 'fast',
      transitionTimingFunction: 'standard',
      '&[data-state=open]': {
        opacity: '1',
        transitionDelay: 'fast',
        _starting: { opacity: '0' },
      },
    },
    // 버튼 얼굴 — 시트 안, 버튼과 같은 자리·같은 모양이다. 처음엔 이것이 보이고(시트가 버튼 크기로 잘려 있다)
    // 펼쳐지면 사라진다. 진짜 버튼을 시트 위로 올릴 필요가 없어 z-index 계약(버튼 39 · 시트 51)이 없다.
    face: {
      pos: 'absolute',
      right: FAB.right,
      bottom: FAB.bottom,
      boxSize: FAB.size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      rounded: 'full',
      bg: 'paper.50',
      color: 'ink.600',
      borderWidth: 'hairline',
      borderColor: 'ink.borderStrong',
      pointerEvents: 'none',
      opacity: '1',
      transitionProperty: 'opacity',
      transitionDuration: 'fast',
      transitionTimingFunction: 'standard',
      '&[data-state=open]': { opacity: '0', _starting: { opacity: '1' } },
    },
  },
});

export const MobileTOC = () => {
  const { toc, activeId } = useTocHook();
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // 닫을 때 시트가 버튼으로 접히는 동안(closing) 마운트를 유지한다 — 접힘은 clip-path 전환이다.
  const sheet = usePresence(drawerRef, 'clip-path');
  const isOpen = sheet.state === 'open';
  const closing = sheet.state === 'closing';
  const parts = sheetParts();
  // 면마다 같은 상태를 단다 — 규칙이 `[data-state=open]`이 걸린 요소 자신의 스타일이다.
  const stateAttr = { 'data-state': sheet.state } as const;

  // 스크롤 잠금·초점·Escape는 다른 오버레이와 같은 훅이 맡는다. 닫기 시작하면 바로 풀린다 —
  // 내려가는 시트는 inert라 초점도 클릭도 받지 않는다.
  useModalDialog({
    // 차례가 비면 드로어도 그리지 않으므로 잠금도 걸지 않는다.
    open: isOpen && toc.length > 0,
    onClose: sheet.close,
    containerRef: drawerRef,
  });

  // h2~h4가 없는 글이면 빈 드로어를 여는 버튼도 두지 않는다.
  if (toc.length === 0) return null;

  return (
    <>
      {/* Floating Button — 등장 애니메이션은 두지 않는다. 차례는 하이드레이션 뒤에 읽혀
          모든 글의 첫 화면에서 버튼이 삽입되므로, 등장을 걸면 하드 로드마다 재생된다. */}
      <button
        type="button"
        onClick={sheet.open}
        // 아이콘만 있는 버튼이라 접근 가능한 이름이 없었다(axe button-name,
        // impact critical). lucide 아이콘은 aria-hidden된 svg라 이름을 못 준다.
        aria-label="목차 열기"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        // 누름은 떠 있는 버튼의 옛 누름이다(`pressFab` — 시트가 쉬는 버튼의 사본에서 펼쳐진다).
        className={css(pressFab, {
          pos: 'fixed',
          bottom: FAB.bottom,
          right: FAB.right,
          boxSize: FAB.size,
          bg: 'paper.50',
          rounded: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'ink.600',
          // 떠 있어도 버튼이라 그림자를 두지 않는다(그림자는 닫히면 사라지는 표면에만,
          // AGENTS.md §9) — hairline 보더로 본문과 분리한다.
          borderWidth: 'hairline',
          borderColor: 'ink.borderStrong',
          zIndex: '39',
          cursor: 'pointer',
          _hover: { color: 'accent.solid' },
          // 푸터가 화면에 들어오면 사라진다 — 고정 버튼이 푸터의 아이콘 링크를 덮고 눌림까지 가로챘다.
          // 푸터의 윗변이 화면 바닥에서 버튼 아랫변(`bottom`)에 닿을 때까지의 거리 동안 옅어지므로,
          // 버튼이 푸터와 겹치는 순간에는 이미 없다. 시간이 아니라 스크롤에 묶인 CSS라 JS가 늘지 않는다.
          // 지원하지 않는 브라우저(Firefox)는 이 블록이 통째로 빠져 버튼이 그대로 남는다 — 이름만 주고
          // 타임라인이 없으면 0초 애니메이션이 끝 상태(사라짐)에 머물기 때문에 `@supports`로 감싼다.
          //
          // 키보드 초점이 버튼에 있는 동안(`:focus-visible`)은 애니메이션을 걸지 않는다 — 끝 상태의
          // `visibility: hidden`은 초점을 든 요소도 초점 불가로 만들어 초점이 문서 맨 앞으로 떨어진다.
          // 푸터와 겹쳐 보이더라도 초점이 있는 동안은 버튼이 남고, 초점이 떠나면 곧바로 이어서 사라진다.
          // 마우스·터치로 누른 버튼은 `:focus-visible`이 아니라 그대로 사라진다.
          '@supports (animation-timeline: view())': {
            animationName: 'fab-away',
            animationTimingFunction: 'linear',
            animationFillMode: 'both',
            animationTimeline: '--site-footer',
            animationRange: `[entry 0px entry token(spacing.${FAB.bottom})]`,
            ...holdAnimationWhileFocused,
          },
        })}
      >
        <List size={24} />
      </button>

      {/* 시트 — body로 portal해 조상의 stacking context·containing block에 갇히지 않게 한다.
          움직임은 버튼에서 펼쳐지는 모핑이다(`sheetParts`): 시트가 버튼 크기의 원으로 잘려 있다가
          medium·standard로 펼쳐지고, 닫을 때는 fast·exit로 같은 길을 되돌아 접힌다. */}
      <Portal>
        {sheet.state !== 'closed' && (
          <>
            <div
              role="presentation"
              onClick={sheet.close}
              inert={closing}
              {...stateAttr}
              className={parts.scrim}
            />
            {/* 닫히는 동안 감싸개째 inert다 — 접히는 시트는 초점도 클릭도 받지 않고, 그 자리의 누름은
                아래의 진짜 버튼이 받는다. */}
            <div inert={closing} {...stateAttr} className={parts.wrap}>
              <div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                {...stateAttr}
                className={parts.sheet}
              >
                <div {...stateAttr} className={parts.content}>
                  <div
                    className={css({
                      p: '5',
                      borderBottomWidth: 'hairline',
                      borderColor: 'ink.border',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    })}
                  >
                    <h2
                      id={titleId}
                      className={css({ fontSize: 'lg', fontWeight: 'bold' })}
                    >
                      목차
                    </h2>
                    <button
                      type="button"
                      onClick={sheet.close}
                      // 열기 버튼과 같은 axe button-name 위반. 드로어가 열렸을 때만
                      // 존재해 스캔에서 늦게 잡혔을 뿐, 같은 이유로 이름이 필요하다.
                      aria-label="목차 닫기"
                      className={css(
                        iconButton.raw({ tone: 'ghost', size: 'md' }),
                        // 보조 잉크는 예전 그대로. 32 상자가 글리프를 4px 안으로 밀어 낸 만큼 되돌려 X가
                        // 제목 줄의 오른쪽 끝에 서게 한다.
                        { color: 'ink.400', mr: '-1' },
                      )}
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div
                    className={css({ p: '5', overflowY: 'auto', flex: '1' })}
                  >
                    <ul
                      className={css({
                        display: 'flex',
                        flexDir: 'column',
                        gap: '3',
                      })}
                    >
                      {toc.map(item => (
                        <li key={item.id}>
                          {/* 데스크탑 차례(post/TOC.tsx)와 같은 이유로 앵커다 —
                                스크롤은 아래 onClick이 가로채지만, href가 있어야
                                키보드 초점·Enter·새 탭으로 열기가 전부 공짜로
                                따라온다. li에 onClick만 달았을 때는 마우스로만
                                닿는 항목이었다. */}
                          <a
                            href={`#${item.id}`}
                            onClick={e => {
                              // 수정자 키가 눌린 클릭은 가로채지 않는다 — 여기서
                              // 기본 동작을 막으면 Cmd/Ctrl+클릭의 새 탭까지 막혀
                              // 앵커로 바꾼 이유가 사라진다.
                              if (isModifiedClick(e)) return;
                              e.preventDefault();
                              scrollToId({
                                id: item.id,
                                // 접힘(175ms)과 스크롤이 겹치지 않게 전환 없이 곧바로 닫는다.
                                action: sheet.closeNow,
                              });
                            }}
                            aria-current={
                              activeId === item.id ? 'true' : undefined
                            }
                            className={tocItem({
                              level: isTocLevel(item.level)
                                ? item.level
                                : undefined,
                              active: activeId === item.id,
                            })}
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <span aria-hidden="true" {...stateAttr} className={parts.face}>
                  <List size={24} />
                </span>
              </div>
            </div>
          </>
        )}
      </Portal>
    </>
  );
};
