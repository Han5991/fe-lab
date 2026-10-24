'use client';

import { css } from '@blog/styled-system/css';

interface LoadingPlaceholderProps {
  height?: string;
}

/**
 * 로딩 상태를 나타내는 펄스 스켈레톤 컴포넌트.
 * admin/page.tsx, admin/analytics/page.tsx에서 중복으로 정의되어 있던 것을 통합.
 */
export function LoadingPlaceholder({ height }: LoadingPlaceholderProps) {
  return (
    <div
      style={{ height: height ?? '100%' }}
      className={css({
        w: 'full',
        bg: 'paper.100',
        // keyframes는 토큰이 싣는다 — optimize.removeUnusedKeyframes도 토큰을 따라가 남긴다
        // (panda.config.ts 주석). 움직임 줄이기에서는 토큰이 애니메이션을 끈다(blog-preset.ts).
        animation: 'skeleton',
        rounded: 'container',
      })}
    />
  );
}
