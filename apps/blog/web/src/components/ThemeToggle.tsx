'use client';

import { Sun, Moon } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { useTheme, setTheme } from '@/src/hooks/useTheme';

export function ThemeToggle() {
  const theme = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSize: '9',
        rounded: '[6px]',
        color: 'ink.600',
        cursor: 'pointer',
        transition: '[all 0.15s]',
        _hover: { color: 'ink.950', bg: 'paper.100' },
      })}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
