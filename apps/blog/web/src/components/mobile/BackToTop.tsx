'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

export const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 300);
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          whileTap={{ scale: 0.9 }}
          className={css({
            pos: 'fixed',
            bottom: '6',
            right: '6',
            w: '12',
            h: '12',
            bg: 'white',
            rounded: 'full',
            shadow: 'lg',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'ink.600',
            borderWidth: '[1px]',
            borderColor: 'ink.border',
            cursor: 'pointer',
            zIndex: '40',
            _hover: { color: 'accent.600', borderColor: 'accent.200' },
          })}
        >
          <ArrowUp size={24} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
