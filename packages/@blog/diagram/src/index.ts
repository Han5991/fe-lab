/**
 * 선언형 다이어그램의 **좌표 계산기** — 프레임워크를 모른다.
 *
 * 그리는 일(SVG 요소·색·클래스)은 소비하는 앱의 몫이고, 여기는 숫자만 낸다.
 * `apps/blog/web`(React)과 `apps/blog/web-svelte`(SvelteKit)가 같은 좌표를
 * 쓰므로 같은 원고가 두 사이트에서 픽셀 단위로 같은 그림이 된다.
 */
export * from './layout.ts';
export * from './types.ts';
