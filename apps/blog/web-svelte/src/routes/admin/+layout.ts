/**
 * Admin은 **프리렌더하되 데이터는 전부 브라우저에서 받는다.**
 *
 * `adapter-static`이므로 서버가 없다 — 프리렌더된 HTML은 빈 껍데기고, 세션
 * 확인·집계 요청은 마운트 후에 돈다. React 판도 정확히 같다(`output: 'export'`로
 * admin 49페이지가 `out/`에 있고 전부 클라이언트에서 채워진다).
 *
 * 그래서 이 HTML에는 어떤 데이터도 실리지 않는다. 인증이 화면에만 있는 것도
 * 같은 이유고, 실제 강제는 Edge Function이 호출자 JWT를 대조하며 한다.
 */
export const prerender = true;
export const trailingSlash = 'always';
