/**
 * 관리자 이메일 판정 — 클라이언트 쪽 접근 판정의 전부.
 *
 * 예전에는 이 파일이 로그인 **경로 계약**(ADMIN_BASE_PATH·ADMIN_LOGIN_PATH·
 * isAdminLoginPath…)까지 들고 있었다. 라우트 경로의 단일 출처가
 * `shared/routes.ts`(최하단 레이어)로 모이면서 경로는 전부 그쪽으로 갔고,
 * 여기는 auth 도메인의 판정만 남는다.
 *
 * 이 모듈은 import 0개를 유지한다 — 배럴(`index.ts`)이 세션용 supabase-js를
 * 모듈 스코프에서 끌어오므로, 판정만 필요한 소비자가 배럴을 우회해 이 모듈을
 * 직접 열어도 아무것도 딸려 오지 않아야 한다.
 */

/**
 * 이 이메일이 관리자인가.
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
