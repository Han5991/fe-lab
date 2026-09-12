/**
 * 다이어그램의 **생김새 단일 출처.**
 *
 * 이 값들을 쓰는 곳이 둘이다 — 본문의 `<diagram>` 태그를 HAST로 굽는
 * `lib/server/markdown/diagram.ts`와, frontmatter `hero:` 슬롯이 그리는
 * Svelte 컴포넌트(`lib/components/diagram/*.svelte`). 앞의 것은 서버 전용
 * 디렉터리에 있어 화면에서 import할 수 없으므로, 스타일만 여기로 뺀다.
 * 사본을 두면 같은 그림이 자리에 따라 다르게 보이고, 그 차이는 어떤 검사에도
 * 안 걸린다.
 *
 * SVG 안 font-size는 user unit이라 viewBox 좌표와 같은 축이다. 타이포 스케일
 * 토큰(rem 기반)을 끌어오면 루트 폰트 크기에 따라 도형과 글자 비율이 어긋나므로
 * 레퍼런스 SVG의 px 값을 그대로 박는다(React 판 `primitives.tsx`와 같은 이유).
 */
import type { DiagramTone } from '@blog/diagram';
import { css } from '../../../styled-system/css';

export const diagramBlock = css({ my: '6' });

/**
 * 본문 `<diagram>`의 프레임 — **intrinsic 폭**이다.
 *
 * 자동 레이아웃 다이어그램의 viewBox 폭은 노드 텍스트 길이의 합이라 그림마다
 * 다르다. 그걸 매번 칼럼 폭까지 늘리면 노드 둘짜리는 부풀고 일곱짜리는
 * 쪼그라들어, 12px로 못 박아 둔 노드 제목이 실제로는 제각각으로 렌더된다.
 * 칼럼은 상한으로만 쓴다.
 */
export const diagramFrame = css({
  maxW: 'full',
  height: 'auto',
  display: 'block',
  mx: 'auto',
  // SVG 안 <text>는 본문 폰트를 따른다.
  fontFamily: 'sans',
});

/**
 * 히어로 슬롯의 프레임 — **칼럼을 꽉 채운다**(React `DiagramFrame`의 기본
 * `sizing: 'fill'`). 손으로 좌표를 박은 다이어그램은 놓일 자리에 맞춰
 * viewBox를 정하므로 칼럼을 채우는 것이 맞다.
 */
export const diagramFrameFill = css({
  w: 'full',
  height: 'auto',
  display: 'block',
  fontFamily: 'sans',
});

export const nodeShape = {
  gray: css({
    fill: 'paper.100',
    stroke: 'ink.border',
    strokeWidth: 'hairline',
  }),
  accent: css({
    fill: 'accent.50',
    stroke: 'accent.500',
    strokeWidth: 'hairline',
  }),
} as const satisfies Record<DiagramTone, string>;

export const nodeTitle = css({
  fontSize: '[12px]',
  fontWeight: 'semibold',
  fill: 'ink.950',
  fontFamily: 'sans',
});

export const nodeSubtitle = css({
  fontSize: '[11px]',
  fill: 'ink.600',
  fontFamily: 'mono',
});

/**
 * 스트로크는 **그룹**에 건다 — 선과 화살촉이 색을 상속받는다. 개별 요소에
 * 걸면 둘이 갈라질 수 있다.
 */
export const edgeRoot = {
  plain: css({
    fill: '[none]',
    strokeWidth: 'hairline',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    stroke: 'ink.600',
    opacity: '[0.55]',
  }),
  // 핵심 경로만 액센트. 스트로크는 비텍스트라 accent.500이다.
  emphasis: css({
    fill: '[none]',
    strokeWidth: 'hairline',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    stroke: 'accent.500',
  }),
} as const;

export const edgeDashed = css({ strokeDasharray: '[3 3]' });

export const captionText = css({
  fontSize: '[11px]',
  fill: 'ink.500',
  fontFamily: 'mono',
});

/**
 * 화살촉을 `<marker>` 대신 선 끝에 직접 그릴 때 쓰는 고정 path와 회전각.
 *
 * 마커는 `url(#id)`로 **문서 전역 id**를 참조해서 한 페이지에 다이어그램이
 * 여러 개 뜨면 id가 중복된다. 모양과 회전 방식까지 React 판과 같다 — 처음에는
 * 좌표를 삼각함수로 직접 풀었는데 결과가 그럴듯해 보여도 두 산출물이 픽셀
 * 단위로 어긋났다.
 */
export const ARROW_HEAD_PATH = 'M -4 -2.6 L 0 0 L -4 2.6';

export const arrowHeadTransform = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string => {
  const degrees = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return `translate(${x2} ${y2}) rotate(${degrees})`;
};
