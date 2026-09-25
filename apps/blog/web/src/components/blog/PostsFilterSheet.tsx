'use client';

import { useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { Portal } from '@/src/components/Portal';
import { useModalDialog } from '@/src/components/useModalDialog';

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

  // 스크롤 잠금·초점 이동/가두기/되돌리기·Escape — 검색 다이얼로그·모바일 차례와
  // 같은 훅이다. 예전엔 이 시트만 따로 구현했고, effect deps에 `onClose`가 있어
  // 호출부가 인라인 화살표를 넘기면(React Compiler가 메모이즈를 포기한 렌더)
  // 필터를 누를 때마다 effect가 다시 돌아 초점이 FAB로 갔다가 첫 요소로 튀고
  // 스크롤 잠금이 깜빡였다. 훅은 onClose를 effect 이벤트로 읽는다.
  useModalDialog({ open, onClose, containerRef: sheetRef });

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
