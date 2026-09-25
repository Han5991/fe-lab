'use client';

import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';

/** 이만큼 내려가면 버튼이 뜬다(px). */
const SHOW_AFTER = 300;

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 동작 줄이기를 켠 사용자에게는 부드러운 스크롤(긴 애니메이션)을 주지 않는다.
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
};

// 스크롤 위치를 외부 저장소로 읽는다. 예전엔 scroll 이벤트에서만 상태를 갱신해,
// 뒤로/앞으로 가기의 스크롤 복원으로 이미 내려와 있는 채 마운트되면 다음 스크롤
// 전까지 버튼이 숨어 있었다. 스냅샷은 마운트 때도 읽히고, 리스너는 passive다.
const subscribeScroll = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
};
const isScrolledDown = () => window.scrollY > SHOW_AFTER;
const serverSnapshot = () => false;

export const BackToTop = () => {
  const isVisible = useSyncExternalStore(
    subscribeScroll,
    isScrolledDown,
    serverSnapshot,
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
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
