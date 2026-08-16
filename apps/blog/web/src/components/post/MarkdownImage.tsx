'use client';

import { css } from '@design-system/ui-lib/css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { resolvePostAssetUrl } from '@blog/content';

interface MarkdownImageProps {
  src?: string | undefined;
  alt?: string | undefined;
  relativeDir?: string;
}

/**
 * Markdown 이미지 렌더러.
 * 상대 경로 이미지를 올바른 URL로 변환하고 Zoom 기능을 추가합니다.
 * 경로 해석은 RSS 전문 렌더링과 공유하는 resolvePostAssetUrl 단일 소스를 사용.
 */
export function MarkdownImage({ src, alt, relativeDir }: MarkdownImageProps) {
  const imageSrc = src ? resolvePostAssetUrl(src, relativeDir) : '';

  return (
    <Zoom>
      <img
        src={imageSrc}
        alt={alt}
        className={css({
          display: 'block',
          my: '14',
          // 리뉴얼 규칙: 위계는 그림자가 아니라 hairline 보더로만 표현한다.
          rounded: 'card',
          w: 'full',
          h: 'auto',
          borderWidth: 'hairline',
          borderColor: 'ink.border',
        })}
      />
    </Zoom>
  );
}
