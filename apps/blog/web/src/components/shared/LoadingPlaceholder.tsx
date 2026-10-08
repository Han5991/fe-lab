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
        // preset-panda animations.pulse와 같은 값이다. keyframes는 그 토큰이 싣는다 — 그래서
        // 블로그 설정은 optimize.removeUnusedKeyframes를 켜지 않는다(panda.config.ts 주석).
        animation: 'pulse',
        rounded: 'control',
      })}
    />
  );
}
