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

/** 화면에 옮겨 적는 OAuth 실패 사유의 최대 길이 — URL에서 온 글자라 짧게 자른다. */
const OAUTH_ERROR_MAX_LENGTH = 200;

/**
 * OAuth 복귀 URL에 붙은 실패 사유. 없으면 null.
 *
 * Supabase(GoTrue)는 실패를 쿼리(`?error=…`)나 프래그먼트(`#error=…`)에
 * `error`·`error_description`으로 싣는다(흐름에 따라 자리가 다르다). 사람이 읽을
 * 문장인 `error_description`을 먼저 쓰고, 없으면 코드(`error`)를 쓴다.
 *
 * URL에서 온 값이라 누구든 링크로 만들 수 있다 — 화면은 고정 문구 아래 참고로만
 * 보여 주고(React가 텍스트로 이스케이프한다), 여기서 길이를 자른다.
 */
export function readOAuthRedirectError(
  search: string,
  hash: string,
): string | null {
  for (const raw of [search, hash]) {
    const params = new URLSearchParams(raw.replace(/^[?#]/, ''));
    const reason = (
      params.get('error_description') ?? params.get('error')
    )?.trim();
    if (reason) return reason.slice(0, OAUTH_ERROR_MAX_LENGTH);
  }
  return null;
}
