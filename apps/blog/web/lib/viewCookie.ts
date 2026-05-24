/**
 * useViewCount 쿠키 로직의 순수 함수 추출.
 *
 * 브라우저 document.cookie 대신 문자열 인터페이스를 받아 테스트 가능하도록 합니다.
 */

export const VIEW_COOLDOWN_HOURS = 6;

/**
 * slug를 쿠키 키-안전 문자열로 변환합니다.
 */
export function slugToViewKey(slug: string): string {
  return `viewed_${slug.replace(/[^a-zA-Z0-9-]/g, '_')}`;
}

/**
 * 쿠키 문자열에 해당 키가 포함되어 있는지 확인합니다.
 */
export function hasViewCookie(cookieStr: string, viewKey: string): boolean {
  return cookieStr.split('; ').some(row => row.startsWith(`${viewKey}=`));
}

/**
 * 만료 시각(Date)과 키로 쿠키 직렬화 문자열을 만듭니다.
 */
export function buildViewCookieStr(viewKey: string, expiresAt: Date): string {
  return `${viewKey}=true; expires=${expiresAt.toUTCString()}; path=/`;
}

/**
 * 현재 시각으로부터 VIEW_COOLDOWN_HOURS 뒤의 만료 Date를 반환합니다.
 */
export function getViewCookieExpiry(now: Date = new Date()): Date {
  const expires = new Date(now);
  expires.setTime(expires.getTime() + VIEW_COOLDOWN_HOURS * 60 * 60 * 1000);
  return expires;
}
