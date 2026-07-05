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
    fontSize: 'xs',
    lineHeight: 'flat',
    py: size === 'sm' ? '[1px]' : '[2px]',
    px: size === 'sm' ? '[8px]' : '[10px]',
    rounded: '[2rem]',
    fontWeight: 'medium',
    bg: active ? 'paper.300' : 'paper.200',
    color: 'ink.700',
    transition: '[all 0.15s]',
    whiteSpace: 'nowrap',
    cursor: onClick ? 'pointer' : 'default',
    _hover: onClick ? { bg: 'paper.300' } : undefined,
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
