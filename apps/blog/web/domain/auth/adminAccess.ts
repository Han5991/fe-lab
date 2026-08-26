/**
 * 관리자 접근 판정의 단일 출처 — 이메일 대조와 로그인 경로 계약.
 *
 * 예전에는 이메일 비교가 AdminGuard 안에 세 번, "지금이 로그인 페이지인가"
 * 판정이 세 곳(AdminGuard 둘 + AdminLayoutClient)에 흩어져 있었고, 후자는
 * 슬래시 처리까지 서로 달랐다(trailingSlash: true 사이트에서 가드 쪽이 틀린
 * 형태만 봤다). 판정이 흩어지면 한쪽만 고쳐져 어긋난다 — 여기 모은다.
 */

/**
 * 로그인 화면의 canonical 경로. `trailingSlash: true`라 내부 이동은 언제나
 * 슬래시형을 쓴다(next.config.ts의 후행 슬래시 계약).
 */
export const ADMIN_LOGIN_PATH = '/admin/login/';

/** 허용되지 않은 계정으로 로그인했을 때 보내는 경로. */
export const ADMIN_LOGIN_UNAUTHORIZED_PATH = `${ADMIN_LOGIN_PATH}?error=unauthorized`;

/**
 * 현재 경로가 로그인 화면인가.
 *
 * 프로덕션(정적 export)의 pathname은 슬래시형이지만, dev 서버는
 * `skipTrailingSlashRedirect`로 두 형태를 모두 200으로 서빙하므로 둘 다 참으로
 * 본다 — 어느 형태로 열어도 가드가 로그인 화면을 로그인 화면으로 보내는
 * 무한 루프가 생기지 않아야 한다.
 */
export function isAdminLoginPath(pathname: string | null | undefined): boolean {
  return pathname === '/admin/login' || pathname === ADMIN_LOGIN_PATH;
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
