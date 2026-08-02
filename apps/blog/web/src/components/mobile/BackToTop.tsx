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
          // MobileTOC와 같은 이유 — 아이콘 단독 버튼이라 이름이 필요하다.
          // 스크롤 전에는 렌더되지 않아 axe 스캔에 안 잡혔을 뿐, 같은 결함이다.
          aria-label="맨 위로 이동"
          whileTap={{ scale: 0.9 }}
          className={css({
            pos: 'fixed',
            bottom: '6',
            right: '6',
            w: '12',
            h: '12',
            bg: 'paper.100',
            rounded: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'ink.900',
            // 떠 있는 버튼이지만 그림자 대신 hairline 보더로 본문과 분리한다.
            borderWidth: 'hairline',
            borderColor: 'ink.borderStrong',
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
