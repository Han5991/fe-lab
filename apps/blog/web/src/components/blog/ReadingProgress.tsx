'use client';

import { useEffect, useState } from 'react';
import { css } from '@design-system/ui-lib/css';

/**
 * 페이지 최상단 sticky 진행률 바.
 * 글 본문 길이가 아닌 documentElement 기준으로 계산한다 (전체 글 + 댓글 영역 포함).
 */
export const ReadingProgress = () => {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) {
        setPct(0);
        return;
      }
      const ratio = (window.scrollY / total) * 100;
      setPct(Math.max(0, Math.min(100, ratio)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={css({
        pos: 'fixed',
        top: '14',
        left: '0',
        right: '0',
        h: '[3px]',
        zIndex: '9',
        bg: 'transparent',
        pointerEvents: 'none',
      })}
    >
      <div
        className={css({
          h: 'full',
          bg: 'marker.600',
          transition: '[width 0.1s linear]',
        })}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
