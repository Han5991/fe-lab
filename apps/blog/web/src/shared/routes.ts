/**
 * 앱이 소유한 라우트 경로의 **단일 출처** — 모든 레이어(lib·domain·src)가
 * 쓸 수 있는 최하단 레이어다(`eslint.config.mts`의 boundaries가 강제).
 *
 * 여기 있는 것은 **이 사이트의 라우트 모양**뿐이다. 패키지가 소유한 라우트
 * (`/posts/`·`postPath`·`archivePath`·`/rss.xml`)는 `@blog/content`가 단일
 * 출처이므로 여기서 다시 들지 않는다 — 사본이 생기는 순간 갈라진다.
 *
 * 예전에는 admin 경로가 `domain/auth/adminAccess`와
 * `src/app/admin/analytics/adminAnalyticsPath`에, 정적 페이지 경로가
 * `content.values.mts`에 나뉘어 있었고, 그마저 우회한 리터럴이 admin 화면
 * 4곳·시리즈 내비 1곳에 남아 있었다. 값 모듈(`content.values.mts`)은 값
 * import 금지 계약이라 이 모듈을 가져가지 못한다 — 거기 남은 사본
 * (sitemap·llms·번들 규칙용)은 `contentValues.test.ts`가 이 모듈과 잠근다.
 */
import { decodeUrlSafe, encodePostSlug } from '@blog/content';

// ── 홈 · 정적 페이지 ─────────────────────────────────────────────────────────
// `trailingSlash: true`(next.config.ts)라 후행 슬래시를 포함한다.

export const HOME_PATH = '/';
export const ABOUT_PATH = '/about/';
export const SERIES_PATH = '/series/';
export const PRIVACY_PATH = '/privacy/';

// ── admin 영역 ───────────────────────────────────────────────────────────────

/**
 * admin 영역의 루트. 아래 경로는 전부 여기서 파생된다 — `/admin`을 여러 번
 * 적어 두면 영역을 옮길 때 한 곳만 고쳐지고 나머지가 조용히 어긋난다.
 * 후행 슬래시는 붙이지 않는다(필요한 쪽이 붙인다).
 */
export const ADMIN_BASE_PATH = '/admin';

/** admin 대시보드의 canonical 경로(슬래시형) — 내부 `<Link href>`용. */
export const ADMIN_PATH = `${ADMIN_BASE_PATH}/`;

/**
 * 로그인 화면의 무슬래시형. dev 서버가 `skipTrailingSlashRedirect`로 두 형태를
 * 모두 200으로 서빙하므로 `isAdminLoginPath`가 이 형태도 알아야 한다.
 * **판정 전용이다** — 내부 이동에는 아래 canonical을 쓴다.
 */
const ADMIN_LOGIN_PATH_NO_SLASH = `${ADMIN_BASE_PATH}/login`;

/**
 * 로그인 화면의 canonical 경로. `trailingSlash: true`라 내부 이동은 언제나
 * 슬래시형을 쓴다(next.config.ts의 후행 슬래시 계약).
 */
export const ADMIN_LOGIN_PATH = `${ADMIN_LOGIN_PATH_NO_SLASH}/`;

/** 허용되지 않은 계정으로 로그인했을 때 보내는 경로. */
export const ADMIN_LOGIN_UNAUTHORIZED_PATH = `${ADMIN_LOGIN_PATH}?error=unauthorized`;

/** OAuth가 실패해 돌아왔을 때의 로그인 경로 — 가드가 복귀 URL의 실패 사유를 실어 보낸다. */
export function adminLoginErrorPath(description: string): string {
  return `${ADMIN_LOGIN_PATH}?error=oauth&error_description=${encodeURIComponent(description)}`;
}

/**
 * OAuth를 마친 브라우저가 돌아올 경로.
 *
 * **무슬래시인 것이 의도다.** `trailingSlash: true` 계약과는 어긋나서 로그인
 * 때마다 후행 슬래시를 붙이는 307을 한 번 더 타지만(`wrangler.jsonc`의
 * `html_handling: force-trailing-slash`가 내는 코드다), 이 값은 코드 혼자
 * 정하는 게 아니라 **Supabase 대시보드의 허용 리다이렉트 목록과 짝**이다.
 * 목록이 정확 일치로 걸려 있을 때 코드만 슬래시형으로 바꾸면 프로덕션 로그인이
 * 깨진다 — 바꿀 때는 둘을 함께 바꿀 것.
 *
 * 그래서 `ADMIN_BASE_PATH`를 그대로 쓴다. 슬래시를 붙이는 파생을 여기 두면
 * 위 계약이 코드 모양으로는 안 보이게 된다.
 */
export const ADMIN_LOGIN_REDIRECT_PATH = ADMIN_BASE_PATH;

/**
 * 로그인 후 돌아올 **절대 URL**.
 *
 * origin을 인자로 받는 이유: 이 값을 아는 건 브라우저뿐이다. 사이트가 정적
 * export라 런타임 서버가 없고(요청 Host를 볼 곳이 없다), Next도 클라이언트에
 * origin을 주지 않는다(`next/navigation`은 path·query까지만). 그렇다고
 * `SITE_URL`로 고정하면 로컬·프리뷰에서 프로덕션으로 튕겨 로그인이 깨진다.
 *
 * 절대 URL이어야 하는 이유는 이 값을 쓰는 쪽이 Supabase **서버**이기 때문이다
 * — 토큰 교환을 마친 뒤 302 Location에 그대로 실어 보낸다.
 */
export function adminLoginRedirectUrl(origin: string): string {
  return `${origin}${ADMIN_LOGIN_REDIRECT_PATH}`;
}

/**
 * 현재 경로가 로그인 화면인가.
 *
 * 프로덕션(정적 export)의 pathname은 슬래시형이지만, dev 서버는
 * `skipTrailingSlashRedirect`로 두 형태를 모두 200으로 서빙하므로 둘 다 참으로
 * 본다 — 어느 형태로 열어도 가드가 로그인 화면을 로그인 화면으로 보내는
 * 무한 루프가 생기지 않아야 한다.
 */
export function isAdminLoginPath(pathname: string | null | undefined): boolean {
  return (
    pathname === ADMIN_LOGIN_PATH_NO_SLASH || pathname === ADMIN_LOGIN_PATH
  );
}

/** admin 통계 목록(`/admin/analytics/`). 후행 슬래시는 next.config의 trailingSlash 계약. */
export const ADMIN_ANALYTICS_PATH = `${ADMIN_BASE_PATH}/analytics/`;

/**
 * 글 하나의 admin 통계 상세 경로 — 공개 글 상세와 같은 catch-all이라 인코딩도 `postPath`와
 * 같다(라우트 쪽 디코드는 아래 `slugFromRouteParam`).
 */
export function adminAnalyticsPostPath(slug: string): string {
  return `${ADMIN_ANALYTICS_PATH}${encodePostSlug(slug)}/`;
}

/**
 * catch-all 라우트 파라미터를 글 slug로 되돌린다 — 세그먼트를 잇고 디코드한다. 잘못된 `%`
 * 인코딩에도 던지지 않아(`decodeUrlSafe`) 조회만 빗나가 404로 끝난다.
 */
export function slugFromRouteParam(
  param: string | string[] | undefined,
): string {
  const raw =
    typeof param === 'string'
      ? param
      : Array.isArray(param)
        ? param.join('/')
        : '';
  return decodeUrlSafe(raw);
}
