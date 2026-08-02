'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';
import { Portal } from '@/src/components/Portal';

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
                      <li
                        key={item.id}
                        onClick={() =>
                          scrollToId({
                            id: item.id,
                            headerOffset: 80,
                            action: () => setIsOpen(false),
                          })
                        }
                        className={css({
                          pl:
                            item.level === 4
                              ? '6'
                              : item.level === 3
                                ? '4'
                                : item.level === 2
                                  ? '2'
                                  : '0',
                          fontSize: 'md',
                          fontWeight: activeId === item.id ? 'bold' : 'medium',
                          color:
                            activeId === item.id ? 'accent.600' : 'ink.600',
                          cursor: 'pointer',
                          transition: '[color 0.2s]',
                          _hover: { color: 'accent.600' },
                        })}
                      >
                        {item.text}
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
