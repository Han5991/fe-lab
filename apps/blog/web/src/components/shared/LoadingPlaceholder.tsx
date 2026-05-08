'use client';

import { css, cx } from '@design-system/ui-lib/css';

interface LoadingPlaceholderProps {
  height?: string;
  className?: string;
}

/**
 * 로딩 상태를 나타내는 펄스 스켈레톤 컴포넌트.
 * admin/page.tsx, admin/analytics/page.tsx에서 중복으로 정의되어 있던 것을 통합.
 */
export function LoadingPlaceholder({
  height,
  className,
}: LoadingPlaceholderProps) {
  return (
    <div
      style={{ height: height ?? '100%' }}
      className={cx(
        css({
          w: 'full',
          bg: 'paper.100',
          animation: '[pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite]',
          rounded: 'lg',
        }),
        className,
      )}
    />
  );
}
