/**
 * useViewCount 쿠키 로직의 순수 함수 추출.
 *
 * 브라우저 document.cookie 대신 문자열 인터페이스를 받아 테스트 가능하도록 합니다.
 */

export const VIEW_COOLDOWN_HOURS = 6;

/**
 * slug를 쿠키 키-안전 문자열로 변환합니다.
 *
 * encodeURIComponent는 slug를 1:1로 인코딩하므로 서로 다른 slug가 같은 키로
 * 충돌하는 것을 막습니다. (이전 구현은 비영숫자를 모두 `_`로 뭉개, 한글/슬래시
 * slug인 `a/b`와 `a_b`가 `viewed_a_b`로 충돌해 한 글 조회가 다른 글의 6시간
 * 쿨다운을 잘못 트리거했습니다.) 쿠키 이름 토큰에서 separator인 괄호 `()`만
 * 추가로 %XX 인코딩합니다.
 *
 * ## 키 마이그레이션 (1회성)
 * `[a-zA-Z0-9-]`로만 이루어진 slug는 encodeURIComponent가 그대로 두므로 키가
 * 동일합니다(하위호환). 그러나 `.`·한글·`/`·공백 등 다른 문자가 든 slug는 키가
 * 바뀝니다 — 예: `turborepo-next.js-docker`는 옛 `viewed_turborepo-next_js-docker`
 * → 새 `viewed_turborepo-next.js-docker`. 배포 직전 6시간(`VIEW_COOLDOWN_HOURS`)
 * 내에 해당 글을 본 사용자는 옛 쿠키가 새 키와 매칭되지 않아 **1회** 조회수가
 * 더 카운트될 수 있습니다(영구 아님, 쿨다운 만료와 함께 자가 치유). 충돌 버그를
 * 없애기 위한 1회성 비용으로 수용합니다.
 */
export function slugToViewKey(slug: string): string {
  const encoded = encodeURIComponent(slug).replace(
    /[()]/g,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `viewed_${encoded}`;
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
