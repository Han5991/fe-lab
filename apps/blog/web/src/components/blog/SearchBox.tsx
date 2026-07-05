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
    if (typeof navigator === 'undefined') return;
    // navigator.platform은 deprecated. 우선 NavigatorUAData(Chromium 90+)를 보고
    // 없으면 userAgent 문자열을 fallback으로 검사합니다.
    const ua = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platform = ua.userAgentData?.platform ?? navigator.userAgent ?? '';
    const isMac = /Mac|iPhone|iPad|iPod/.test(platform);
    // 클라이언트 mount 후 navigator 감지 결과를 라벨에 반영하는 외부 시스템 sync.
    // SSR/CSR 첫 render는 'Ctrl K' 디폴트라 hydration mismatch 없음.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(navigator) 1회 측정
    setHotkeyLabel(isMac ? '⌘K' : 'Ctrl K');
  }, []);

  const inner = (
    <div
      className={css({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        w: 'full',
        h: '[32px]',
        px: '[12px]',
        bg: 'paper.100',
        borderWidth: '[1px]',
        borderColor: 'ink.border',
        rounded: '[6px]',
        cursor: 'pointer',
        transition: '[border-color 0.15s, box-shadow 0.15s]',
        _hover: { borderColor: 'ink.borderStrong' },
        _focusWithin: {
          borderColor: 'accent.600',
          boxShadow: '[0 0 0 1px token(colors.accent.600)]',
        },
      })}
    >
      <Search
        size={14}
        className={css({ color: 'ink.500', mr: '[8px]', flexShrink: 0 })}
      />
      <span
        className={css({
          fontFamily: 'sans',
          fontSize: 'sm',
          color: 'ink.600',
          flex: '1',
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
            borderWidth: '[1px]',
            borderColor: 'ink.border',
            bg: 'paper.200',
            px: '[6px]',
            py: '[2px]',
            rounded: '[6px]',
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
      <Link
        href={href}
        onClick={onClick}
        className={css({ display: 'block', w: 'full' })}
      >
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
