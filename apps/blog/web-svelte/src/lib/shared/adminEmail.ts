/**
 * 관리자 이메일 판정 — **순수 함수다.**
 *
 * 값(어느 주소가 관리자인가)은 env에서 오고 그건 앱의 일이라 `lib/domain/
 * adminAccess.ts`가 묶는다. 판정만 여기 떼어 둔 이유는 테스트다 — `$env/static/
 * public`을 여는 모듈은 vitest가 SvelteKit 플러그인 없이 열 수 없고, 그 플러그인을
 * 들이면 이 앱의 테스트가 계약 검증에서 라우팅·프리렌더까지 끌어온다.
 * "mock보다 주입으로 끊는다"는 저장소 규칙의 작은 사례다.
 *
 * 이 판정은 **화면 안내용**이다. 실제 강제는 Edge Function이 호출자 JWT를 진짜
 * 시크릿과 대조하며 한다.
 */
export function matchesAdminEmail(
  email: string | null | undefined,
  adminEmail: string | undefined,
): boolean {
  // adminEmail이 비어 있으면 **아무도 관리자가 아니다.** 두 값이 모두 undefined일
  // 때 `email === adminEmail`이 true가 되는 것이 이 함수의 유일한 함정이다 —
  // 설정이 빠진 배포에서 모든 방문자가 관리자가 된다.
  if (adminEmail === undefined || adminEmail.length === 0) return false;
  return email === adminEmail;
}
