'use client';

import { css } from '@design-system/ui-lib/css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

interface MarkdownImageProps {
  src?: string;
  alt?: string;
  relativeDir?: string;
}

/**
 * Markdown 이미지 렌더러.
 * 상대 경로 이미지를 올바른 URL로 변환하고 Zoom 기능을 추가합니다.
 */
export function MarkdownImage({ src, alt, relativeDir }: MarkdownImageProps) {
  let imageSrc = src ?? '';

  if (src && !src.startsWith('http') && !src.startsWith('/')) {
    imageSrc = `/posts/${relativeDir}/${src}`;
  }

  return (
    <Zoom>
      <img
        src={imageSrc}
        alt={alt}
        className={css({
          display: 'block',
          my: '14',
          rounded: '2xl',
          w: 'full',
          h: 'auto',
          shadow: '2xl',
          borderWidth: '1px',
          borderColor: 'gray.100',
        })}
      />
    </Zoom>
  );
}
