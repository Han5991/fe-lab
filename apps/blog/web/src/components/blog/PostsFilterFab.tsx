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
export const PostsFilterFab = ({ onClick, activeCount }: PostsFilterFabProps) => (
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
      gap: '2',
      pl: '4',
      pr: '5',
      h: '12',
      bg: 'ink.950',
      color: 'paper.50',
      rounded: 'full',
      shadow: 'lg',
      fontFamily: 'sans',
      fontSize: 'sm',
      fontWeight: 'semibold',
      cursor: 'pointer',
      zIndex: '40',
      transition: '[transform 0.15s]',
      _active: { shadow: 'md' },
    })}
  >
    <SlidersHorizontal size={18} />
    <span>필터{activeCount > 0 ? ` · ${activeCount}` : ''}</span>
  </motion.button>
);
