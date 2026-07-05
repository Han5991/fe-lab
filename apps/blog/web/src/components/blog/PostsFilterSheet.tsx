'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { Portal } from '@/src/components/Portal';

interface PostsFilterSheetProps {
  open: boolean;
  onClose: () => void;
  onClearAll: () => void;
  activeCount: number;
  children: ReactNode;
}

/**
 * 모바일 /posts 페이지 전용 필터 바텀시트.
 * MobileTOC과 동일한 motion 기반 슬라이드 업 패턴이며, 내용은 호출 측이
 * children으로 주입합니다 (정렬·뷰토글·태그·시리즈·연도 등).
 */
export const PostsFilterSheet = ({
  open,
  onClose,
  onClearAll,
  activeCount,
  children,
}: PostsFilterSheetProps) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Escape로 닫기 + Tab을 시트 내부로 묶어 포커스 트랩.
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    // 다음 frame에 시트가 마운트된 후 첫 focusable로 포커스를 옮깁니다.
    const focusFirst = requestAnimationFrame(() => {
      const first =
        sheetRef.current?.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = sheetRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter(el => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(focusFirst);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className={css({
                pos: 'fixed',
                inset: '0',
                bg: '[rgba(1,4,9,0.8)]',
                zIndex: '50',
              })}
            />
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="글 필터"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={css({
                pos: 'fixed',
                bottom: '0',
                left: '0',
                right: '0',
                bg: 'paper.100',
                borderTopWidth: '[1px]',
                borderRightWidth: '[1px]',
                borderLeftWidth: '[1px]',
                borderStyle: 'solid',
                borderColor: 'ink.border',
                zIndex: '51',
                roundedTop: '[12px]',
                maxH: '[85vh]',
                display: 'flex',
                flexDir: 'column',
                paddingBottom: '[env(safe-area-inset-bottom)]',
              })}
            >
              <div
                className={css({
                  display: 'flex',
                  justifyContent: 'center',
                  pt: '[8px]',
                  pb: '[4px]',
                })}
              >
                <span
                  className={css({
                    width: '[32px]',
                    height: '[4px]',
                    rounded: '[2rem]',
                    bg: 'ink.border',
                  })}
                />
              </div>
              <div
                className={css({
                  px: '[16px]',
                  py: '[12px]',
                  borderBottomWidth: '[1px]',
                  borderBottomStyle: 'solid',
                  borderColor: 'ink.border',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                })}
              >
                <h2
                  className={css({
                    fontSize: '[16px]',
                    fontWeight: 'semibold',
                    color: 'ink.950',
                  })}
                >
                  필터{activeCount > 0 ? ` · ${activeCount}` : ''}
                </h2>
                <div
                  className={css({
                    display: 'flex',
                    gap: '[8px]',
                    alignItems: 'center',
                  })}
                >
                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onClearAll();
                        onClose();
                      }}
                      className={css({
                        bg: 'paper.200',
                        borderWidth: '[1px]',
                        borderStyle: 'solid',
                        borderColor: 'ink.border',
                        rounded: '[6px]',
                        px: '[16px]',
                        py: '[5px]',
                        color: 'ink.800',
                        fontSize: 'sm',
                        fontWeight: 'medium',
                        cursor: 'pointer',
                        _hover: {
                          bg: 'paper.300',
                          borderColor: 'ink.borderStrong',
                        },
                      })}
                    >
                      모두 지우기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="닫기"
                    className={css({ cursor: 'pointer', color: 'ink.600' })}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div
                className={css({
                  px: '[16px]',
                  py: '[16px]',
                  overflowY: 'auto',
                  flex: '1',
                  display: 'flex',
                  flexDir: 'column',
                  gap: '[16px]',
                })}
              >
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};
