'use client';

import { Share2 } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';

interface ShareButtonProps {
  title: string;
}

export const ShareButton = ({ title }: ShareButtonProps) => {
  const handleShare = async () => {
    const shareData = {
      title,
      text: title,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        alert('링크가 클립보드에 복사되었습니다.');
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  return (
    <button
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
  );
};
