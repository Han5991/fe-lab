import { PUBLIC_ADMIN_EMAIL } from '$env/static/public';

/**
 * 이 이메일이 관리자인가 — 클라이언트 쪽 접근 판정의 전부.
 *
 * 실제 강제는 Edge Function(`admin-analytics`)이 호출자 JWT를 `ADMIN_EMAIL`과
 * 대조하며 한다. 여기 판정은 **화면 안내용**(잘못된 계정을 바로 로그아웃시키고
 * 안내 문구로 보내는 것)이라 `PUBLIC_*`이어도 안전하다.
 *
 * `@blog/analytics`가 아니라 앱에 있는 이유: 값을 env에서 읽는 것이 앱의 일이고,
 * 그 env 접근 방식이 프레임워크마다 다르기 때문이다(React 판은
 * `process.env.NEXT_PUBLIC_*`, 여기는 `$env/static/public`). 판정 자체는 한 줄이라
 * 패키지로 옮겨 봐야 인자만 늘어난다.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && email === PUBLIC_ADMIN_EMAIL;
}
