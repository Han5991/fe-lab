'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';

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
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        className={css({
          pos: 'fixed',
          bottom: '20',
          right: '6',
          w: '12',
          h: '12',
          bg: 'white',
          rounded: 'full',
          shadow: 'lg',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'gray.600',
          borderWidth: '1px',
          borderColor: 'gray.200',
          zIndex: 39,
          cursor: 'pointer',
          _hover: { color: 'blue.600', borderColor: 'blue.200' },
        })}
      >
        <List size={24} />
      </motion.button>

      {/* Drawer */}
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
                inset: 0,
                bg: 'black',
                zIndex: 50,
              })}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={css({
                pos: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                bg: 'white',
                zIndex: 51,
                roundedTop: '2xl',
                maxH: '70vh',
                display: 'flex',
                flexDir: 'column',
                shadow: '2xl',
                paddingBottom: 'env(safe-area-inset-bottom)', // iOS safe area
              })}
            >
              <div
                className={css({
                  p: '5',
                  borderBottomWidth: '1px',
                  borderColor: 'gray.100',
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
                  className={css({ cursor: 'pointer', color: 'gray.400' })}
                >
                  <X size={24} />
                </button>
              </div>
              <div className={css({ p: '5', overflowY: 'auto', flex: 1 })}>
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
                        color: activeId === item.id ? 'blue.600' : 'gray.600',
                        cursor: 'pointer',
                        transition: 'color 0.2s',
                        _hover: { color: 'blue.600' },
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
    </>
  );
};
