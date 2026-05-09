'use client';

import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';

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
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={css({
              pos: 'fixed',
              inset: '0',
              bg: 'ink.950',
              zIndex: '50',
            })}
          />
          <motion.div
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
              bg: 'paper.50',
              zIndex: '51',
              roundedTop: '2xl',
              maxH: '[85vh]',
              display: 'flex',
              flexDir: 'column',
              shadow: '2xl',
              paddingBottom: '[env(safe-area-inset-bottom)]',
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
                필터{activeCount > 0 ? ` · ${activeCount}` : ''}
              </h2>
              <div className={css({ display: 'flex', gap: '4', alignItems: 'center' })}>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll();
                      onClose();
                    }}
                    className={css({
                      fontFamily: 'mono',
                      fontSize: 'xs',
                      color: 'ink.500',
                      cursor: 'pointer',
                      _hover: { color: 'marker.600' },
                    })}
                  >
                    모두 지우기
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className={css({ cursor: 'pointer', color: 'ink.400' })}
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div
              className={css({
                p: '5',
                overflowY: 'auto',
                flex: '1',
                display: 'flex',
                flexDir: 'column',
                gap: '7',
              })}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
