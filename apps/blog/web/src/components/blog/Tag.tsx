'use client';

import { css } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  as?: 'button' | 'span';
}

export const Tag = ({
  children,
  active = false,
  size = 'md',
  onClick,
  as = 'button',
}: TagProps) => {
  const className = css({
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'mono',
    fontSize: size === 'sm' ? 'xs' : '[12px]',
    py: size === 'sm' ? '0.5' : '1',
    px: size === 'sm' ? '2' : '2.5',
    letterSpacing: 'mono',
    rounded: 'full',
    borderWidth: '[1px]',
    borderColor: active ? 'ink.950' : 'ink.border',
    bg: active ? 'ink.950' : 'transparent',
    color: active ? 'paper.50' : 'ink.700',
    transition: '[all 0.15s]',
    whiteSpace: 'nowrap',
    cursor: onClick ? 'pointer' : 'default',
    _hover:
      onClick && !active
        ? { borderColor: 'ink.borderStrong', color: 'ink.950' }
        : undefined,
  });

  if (as === 'span') {
    return <span className={className}>{children}</span>;
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
};
