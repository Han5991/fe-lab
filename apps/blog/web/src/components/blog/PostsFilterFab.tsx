'use client';

import { motion } from 'motion/react';
import { SlidersHorizontal } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';

interface PostsFilterFabProps {
  onClick: () => void;
  activeCount: number;
}

/**
 * 모바일에서 /posts 우하단에 떠있는 필터 FAB.
 * `display: { base: 'flex', md: 'none' }`로 데스크톱에서는 숨깁니다.
 */
export const PostsFilterFab = ({
  onClick,
  activeCount,
}: PostsFilterFabProps) => (
  <motion.button
    type="button"
    onClick={onClick}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    whileTap={{ scale: 0.94 }}
    aria-label={`필터 열기${activeCount > 0 ? ` (${activeCount}개 적용 중)` : ''}`}
    className={css({
      display: { base: 'inline-flex', md: 'none' },
      pos: 'fixed',
      bottom: '6',
      right: '6',
      alignItems: 'center',
      gap: '[6px]',
      pl: '[12px]',
      pr: '[14px]',
      h: '[40px]',
      bg: 'paper.200',
      borderWidth: '[1px]',
      borderStyle: 'solid',
      borderColor: 'ink.border',
      color: 'ink.800',
      rounded: '[6px]',
      fontFamily: 'sans',
      fontSize: 'sm',
      fontWeight: 'medium',
      cursor: 'pointer',
      zIndex: '40',
      transition: '[background-color 0.15s, border-color 0.15s]',
      _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
    })}
  >
    <SlidersHorizontal size={16} />
    <span>필터</span>
    {activeCount > 0 && (
      <span
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minW: '[18px]',
          h: '[18px]',
          px: '[5px]',
          bg: 'accent.600',
          color: 'paper.50',
          rounded: '[2rem]',
          fontSize: 'xs',
          fontWeight: 'semibold',
          lineHeight: 'flat',
          fontVariantNumeric: 'tabular-nums',
        })}
      >
        {activeCount}
      </span>
    )}
  </motion.button>
);
