'use client';

import { css, cx } from '@design-system/ui-lib/css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { resolvePostAssetUrl } from '@blog/content';

interface MarkdownImageProps {
  src?: string | undefined;
  alt?: string | undefined;
  /** 원고가 raw HTML로 준 고유 크기 — 버리면 작은 그림이 본문 폭으로 늘고 자리를 못 잡는다. */
  width?: number | string | undefined;
  height?: number | string | undefined;
  relativeDir?: string;
  /** 클릭 확대 — 링크로 감싼 이미지는 끈다(확대 래퍼가 `<a>` 안이면 무효 중첩이다). */
  zoomable?: boolean;
}

// 본문 이미지 모양의 단일 출처 — figure 안의 여백은 Figure의 `& img`가 덮는다.
const imageStyle = css({
  display: 'block',
  my: '4',
  // 리뉴얼 규칙: 위계는 그림자가 아니라 hairline 보더로만 표현한다.
  rounded: 'control',
  h: 'auto',
  borderWidth: 'hairline',
  borderColor: 'ink.border',
});

// 크기를 안 준 마크다운 이미지(`![..](..)`)는 본문 폭을 채운다. 저자가 폭을
// 적었으면 그 폭을 지키고, 칼럼보다 넓을 때만 줄인다.
const fillColumn = css({ w: 'full' });
const keepIntrinsicWidth = css({ maxW: 'full' });

/**
 * Markdown 이미지 렌더러 — 상대 경로를 resolvePostAssetUrl로 풀고 확대를 단다.
 * 전부 지연 로드한다: `loading` 없는 `<img>`마다 React 19가 preload를 심어 히어로와
 * 대역폭을 다툰다(첫 화면 히어로는 PostHero가 따로 그린다).
 */
export function MarkdownImage({
  src,
  alt,
  width,
  height,
  relativeDir,
  zoomable = true,
}: MarkdownImageProps) {
  const imageSrc = src ? resolvePostAssetUrl(src, relativeDir) : '';

  const image = (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={cx(
        imageStyle,
        width === undefined ? fillColumn : keepIntrinsicWidth,
      )}
    />
  );

  return zoomable ? <Zoom>{image}</Zoom> : image;
}
