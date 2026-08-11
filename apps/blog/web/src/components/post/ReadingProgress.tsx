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
    let frame = 0;
    const compute = () => {
      frame = 0;
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) {
        setPct(prev => (prev === 0 ? prev : 0));
        return;
      }
      const ratio = (window.scrollY / total) * 100;
      // 0.5% 단위로 양자화해 setState를 호출. 픽셀 차이 안 나면서 re-render 빈도 ↓.
      const next = Math.round(Math.max(0, Math.min(100, ratio)) * 2) / 2;
      setPct(prev => (prev === next ? prev : next));
    };
    const onScroll = () => {
      // rAF로 throttle. 60fps scroll 이벤트가 와도 frame당 한 번만 계산.
      if (frame !== 0) return;
      frame = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={css({
        pos: 'fixed',
        // 크롬 바로 아래에 붙는다. 좁은 화면은 상단 바(52px) 아래, 넓은 화면은
        // 세로 레일이라 위쪽에 가릴 것이 없으므로 화면 맨 위다. 예전에는 52px
        // 헤더에 맞춘 `top: '14'`(56px)가 하드코딩돼 있어서, 헤더가 사라지면
        // 진행률 바가 본문 위 56px 지점을 가로지른다.
        top: { base: '[52px]', lg: '0' },
        // 레일이 차지한 폭은 비운다 — 안 그러면 바가 레일 위로 지나간다.
        left: { base: '0', lg: '[64px]' },
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
          bg: 'accent.600',
          transition: '[width 0.1s linear]',
        })}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
