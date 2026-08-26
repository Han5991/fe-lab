/**
 * 관리자 접근 판정의 단일 출처 — 이메일 대조와 로그인 경로 계약.
 *
 * 예전에는 이메일 비교가 AdminGuard 안에 세 번, "지금이 로그인 페이지인가"
 * 판정이 세 곳(AdminGuard 둘 + AdminLayoutClient)에 흩어져 있었고, 후자는
 * 슬래시 처리까지 서로 달랐다(trailingSlash: true 사이트에서 가드 쪽이 틀린
 * 형태만 봤다). 판정이 흩어지면 한쪽만 고쳐져 어긋난다 — 여기 모은다.
 */

/**
 * admin 영역의 루트. 아래 경로는 전부 여기서 파생된다 — `/admin`을 여러 번
 * 적어 두면 영역을 옮길 때 한 곳만 고쳐지고 나머지가 조용히 어긋난다.
 * 후행 슬래시는 붙이지 않는다(필요한 쪽이 붙인다).
 */
export const ADMIN_BASE_PATH = '/admin';

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

/**
 * OAuth를 마친 브라우저가 돌아올 경로.
 *
 * **무슬래시인 것이 의도다.** `trailingSlash: true` 계약과는 어긋나서 로그인
 * 때마다 GitHub Pages 301을 한 번 더 타지만, 이 값은 코드 혼자 정하는 게
 * 아니라 **Supabase 대시보드의 허용 리다이렉트 목록과 짝**이다. 목록이 정확
 * 일치로 걸려 있을 때 코드만 슬래시형으로 바꾸면 프로덕션 로그인이 깨진다 —
 * 바꿀 때는 둘을 함께 바꿀 것.
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

/**
 * 이 이메일이 관리자인가 — 클라이언트 쪽 판정의 전부.
 *
 * 실제 강제는 Edge Function(admin-analytics)이 호출자 JWT를 ADMIN_EMAIL과
 * 대조하며 한다. 여기 판정은 화면 안내용(잘못된 계정을 바로 로그아웃시키고
 * 안내 문구로 보내는 것)이라 NEXT_PUBLIC이어도 안전하다.
 *
 * 두 번째 인자는 테스트 주입용 — 기본값의 `process.env.NEXT_PUBLIC_*` 멤버
 * 표현식은 Next가 빌드 타임에 리터럴로 인라인한다(env.d.ts 참고).
 */
export function isAdminEmail(
  email: string | null | undefined,
  adminEmail: string | undefined = process.env.NEXT_PUBLIC_ADMIN_EMAIL,
): boolean {
  return Boolean(email) && email === adminEmail;
}
