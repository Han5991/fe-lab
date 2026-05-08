'use client';

import { css } from '@design-system/ui-lib/css';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SearchBoxProps {
  placeholder?: string;
  href?: string;
  onClick?: () => void;
  showHotkey?: boolean;
}

export const SearchBox = ({
  placeholder = '글 제목, 태그, 본문…',
  href,
  onClick,
  showHotkey = true,
}: SearchBoxProps) => {
  const [hotkeyLabel, setHotkeyLabel] = useState('Ctrl K');

  useEffect(() => {
    const isMac =
      typeof navigator !== 'undefined' &&
      /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    setHotkeyLabel(isMac ? '⌘K' : 'Ctrl K');
  }, []);

  const inner = (
    <div
      className={css({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        w: 'full',
        h: '11',
        px: '3',
        bg: 'paper.50',
        borderWidth: '1px',
        borderColor: 'ink.border',
        rounded: 'lg',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        _hover: { borderColor: 'ink.borderStrong' },
      })}
    >
      <Search size={14} className={css({ color: 'ink.500', mr: '2', flexShrink: 0 })} />
      <span
        className={css({
          fontFamily: 'sans',
          fontSize: 'sm',
          color: 'ink.500',
          flex: 1,
        })}
      >
        {placeholder}
      </span>
      {showHotkey && (
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: '2xs',
            color: 'ink.500',
            borderWidth: '1px',
            borderColor: 'ink.border',
            bg: 'paper.100',
            px: '1.5',
            py: '0.5',
            rounded: 'sm',
            flexShrink: 0,
          })}
        >
          {hotkeyLabel}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={css({ display: 'block', w: 'full' })}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={css({ display: 'block', w: 'full', cursor: 'pointer' })}
    >
      {inner}
    </button>
  );
};
