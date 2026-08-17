/**
 * Edge Function 타입 검사용 Deno 전역 shim.
 *
 * 이 저장소는 deno를 설치하지 않는다(로컬 실행은 `supabase start`가 컨테이너
 * 안에서, 배포는 CLI가 한다). 그래서 `deno check` 대신 앱의 tsc로 Edge Function을
 * 검사하고, 런타임이 주는 전역만 여기서 최소한으로 선언한다.
 *
 * **실제 Deno 타입 선언이 아니다.** 함수가 새 Deno API를 쓰기 시작하면 여기에
 * 시그니처를 더해야 한다 — 없는 API를 쓰면 "존재하지 않는다"고 에러가 나므로
 * 조용히 통과하지는 않는다.
 */

declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
  const env: { get(key: string): string | undefined };
}
