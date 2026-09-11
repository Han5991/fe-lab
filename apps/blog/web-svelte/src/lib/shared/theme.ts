/**
 * 테마 쿠키의 단일 출처 — pre-paint 인라인 스크립트와 토글이 함께 읽는다.
 *
 * `apps/blog/web/src/hooks/theme-cookie.ts`와 같은 값이다. 정규식이 두 곳에
 * 있으면 한쪽만 바뀌어 초기 테마가 어긋나고, 그게 정확히 이 스크립트가 막으려던
 * FOUC다.
 *
 * 인라인 스크립트는 hydration 전에 돌아야 해서 이 모듈을 import할 수 없다.
 * 대신 `app.html`이 같은 문자열을 갖고, 아래 테스트가 둘을 대조한다.
 */
export const THEME_COOKIE = 'theme';
export const THEME_COOKIE_MATCH = '(?:^|;\\s*)theme=(dark|light)';

export type Theme = 'dark' | 'light';

/** 쿠키에서 명시 선택을 읽는다. 없으면 undefined — 시스템 설정을 따른다는 뜻. */
export function readThemeCookie(cookie: string): Theme | undefined {
  const m = new RegExp(THEME_COOKIE_MATCH).exec(cookie);
  return m?.[1] === 'dark' || m?.[1] === 'light' ? m[1] : undefined;
}
