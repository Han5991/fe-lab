'use client';

import { css, cx } from '@design-system/ui-lib/css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { resolvePostAssetUrl } from '@blog/content';

interface MarkdownImageProps {
  src?: string | undefined;
  alt?: string | undefined;
  /**
   * 원고가 raw HTML로 준 고유 크기(`<img width=250 height=250>`). 그대로 싣는다 —
   * 버리면 250px짜리 그림이 본문 폭(680px)으로 늘어나고, 도착 전까지 자리를 못
   * 잡아 레이아웃이 밀린다. 값 해석(숫자·`100%`)은 브라우저의 속성 규칙에 맡긴다.
   */
  width?: number | string | undefined;
  height?: number | string | undefined;
  relativeDir?: string;
  /**
   * 클릭 확대. 링크로 감싼 이미지(`[![..](..)](..)`)는 끈다 — 클릭은 링크의
   * 몫이고, 확대 래퍼의 `<div>`·`<button>`이 `<a>` 안에 들어가면 무효 중첩
   * (hydration mismatch)에 대화형 요소 중첩까지 된다.
   */
  zoomable?: boolean;
}

// 본문 이미지 모양의 단일 출처. 예전에는 PostBody의 `& img`(명시도 0,1,1)가
// 같은 속성을 따로 들고 있어 여기 적은 `my:14`·`rounded:card`는 한 번도 적용된
// 적이 없었다(화면에 나간 건 저쪽의 4·control). 실제로 나가던 값을 여기로 모으고
// 저쪽은 지웠다. figure 안에서만 달라지는 여백은 Figure의 `& img`가 덮는다.
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
 * Markdown 이미지 렌더러.
 * 상대 경로 이미지를 올바른 URL로 변환하고 Zoom 기능을 추가합니다.
 * 경로 해석은 @blog/content의 resolvePostAssetUrl 단일 소스를 사용.
 *
 * 본문 이미지는 전부 **지연 로드**한다. `loading`이 없는 `<img>`마다 React 19가
 * 서버 HTML에 `<link rel="preload" as="image">`를 심어서, 본문 이미지가 스크롤과
 * 무관하게 페이지 로드 시점에 한꺼번에 받아지며 히어로·폰트와 대역폭을 다퉜다.
 * 첫 화면을 차지하는 히어로는 PostHero가 따로 그리므로 여기서 eager로 둘 이미지는
 * 없다.
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
