/**
 * 라우트 전역 옵션 — 이 앱의 SSG 계약이 여기 있다.
 *
 * `prerender: true`는 React 판의 `output: 'export'`에, `trailingSlash: 'always'`는
 * `trailingSlash: true`에 대응한다. 후행 슬래시는 호스팅 설정
 * (`html_handling: force-trailing-slash`)과 짝이라 한쪽만 바꾸면 정규 URL이
 * 둘로 갈라진다.
 */
export const prerender = true;
export const trailingSlash = 'always';
