'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X } from 'lucide-react';
import { css, cva } from '@design-system/ui-lib/css';
import type { RecipeVariant } from '@design-system/ui-lib/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';
import { Portal } from '@/src/components/Portal';

/** 목차 항목 한 줄 — level은 헤딩 깊이만큼 들여쓰고, active는 현재 절을 비춘다. */
const tocItem = cva({
  base: {
    // 앵커가 인라인이면 글자 폭만 눌리는 자리가 된다. li 한 줄 전체가
    // 탭 대상이었던 예전 동작을 유지하려면 블록이어야 한다.
    display: 'block',
    fontSize: 'md',
    cursor: 'pointer',
    transition: '[color 0.2s]',
    _hover: { color: 'accent.600' },
  },
  variants: {
    level: {
      1: { pl: '0' },
      2: { pl: '2' },
      3: { pl: '4' },
      4: { pl: '6' },
    },
    active: {
      true: { fontWeight: 'bold', color: 'accent.600' },
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

export const MobileTOC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { toc, activeId } = useTocHook();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        // 아이콘만 있는 버튼이라 접근 가능한 이름이 없었다(axe button-name,
        // impact critical). lucide 아이콘은 aria-hidden된 svg라 이름을 못 준다.
        aria-label="목차 열기"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        className={css({
          pos: 'fixed',
          bottom: '20',
          right: '6',
          w: '12',
          h: '12',
          bg: 'paper.50',
          rounded: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'ink.600',
          // 떠 있는 버튼이지만 그림자 대신 hairline 보더로 본문과 분리한다.
          borderWidth: 'hairline',
          borderColor: 'ink.borderStrong',
          zIndex: '39',
          cursor: 'pointer',
          _hover: { color: 'accent.600', borderColor: 'accent.200' },
        })}
      >
        <List size={24} />
      </motion.button>

      {/* Drawer — body로 portal해 PageTransition 래퍼(zIndex:0) stacking에 갇히지 않게 한다 */}
      <Portal>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className={css({
                  pos: 'fixed',
                  inset: '0',
                  bg: 'ink.950',
                  zIndex: '50',
                })}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={css({
                  pos: 'fixed',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  bg: 'paper.50',
                  zIndex: '51',
                  roundedTop: 'card',
                  maxH: '[70vh]',
                  display: 'flex',
                  flexDir: 'column',
                  // 뒤를 덮는 dim 오버레이가 이미 레이어를 갈라주므로 그림자는
                  // 빼고 상단 hairline 보더만 남긴다.
                  borderTopWidth: 'hairline',
                  borderColor: 'ink.border',
                  pb: '[env(safe-area-inset-bottom)]',
                })}
              >
                <div
                  className={css({
                    p: '5',
                    borderBottomWidth: '[1px]',
                    borderColor: 'ink.border',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  })}
                >
                  <h2 className={css({ fontSize: 'lg', fontWeight: 'bold' })}>
                    목차
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    // 열기 버튼과 같은 axe button-name 위반. 드로어가 열렸을 때만
                    // 존재해 스캔에서 늦게 잡혔을 뿐, 같은 이유로 이름이 필요하다.
                    aria-label="목차 닫기"
                    className={css({ cursor: 'pointer', color: 'ink.400' })}
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className={css({ p: '5', overflowY: 'auto', flex: '1' })}>
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
                            if (
                              e.metaKey ||
                              e.ctrlKey ||
                              e.shiftKey ||
                              e.altKey
                            )
                              return;
                            e.preventDefault();
                            scrollToId({
                              id: item.id,
                              headerOffset: 80,
                              action: () => setIsOpen(false),
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
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
};
