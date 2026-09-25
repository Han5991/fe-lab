'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';

interface ShareButtonProps {
  title: string;
}

/** 사용자가 공유 시트를 닫은 것 — 실패가 아니다. */
const isAbort = (err: unknown) =>
  err instanceof DOMException && err.name === 'AbortError';

const NOTICE_MS = 2500;

/**
 * 공유하기. Web Share가 있으면 시트를 열고, 없거나 **실패하면**(NotAllowedError
 * 등 — 사용자가 닫은 AbortError 말고) 링크를 클립보드에 복사한다. 예전엔
 * 실패가 콘솔에만 남아 버튼이 아무 일도 하지 않았고, 복사 안내는 화면을 멈추는
 * `alert()`였다 — 지금은 버튼 옆 상태 문구(role="status")로 알린다.
 */
export const ShareButton = ({ title }: ShareButtonProps) => {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const announce = (message: string) => {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      announce('링크를 복사했습니다');
    } catch (err) {
      console.error('Failed to copy', err);
      announce('링크를 복사하지 못했습니다');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (err) {
        if (isAbort(err)) return;
        console.warn('Share failed, falling back to clipboard', err);
      }
    }
    await copyLink(url);
  };

  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
      <span role="status" className={css({ fontSize: 'sm', color: 'ink.600' })}>
        {notice}
      </span>
      <button
        type="button"
        onClick={() => void handleShare()}
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '2',
          px: '4',
          py: '2',
          bg: 'paper.200',
          rounded: 'full',
          color: 'ink.800',
          fontSize: 'sm',
          fontWeight: 'medium',
          cursor: 'pointer',
          transition: '[all 0.2s]',
          _hover: { bg: 'paper.300' },
        })}
      >
        <Share2 size={16} />
        <span>공유하기</span>
      </button>
    </div>
  );
};
