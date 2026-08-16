/**
 * 이 앱이 읽는 `NEXT_PUBLIC_*` 환경변수의 타입 선언.
 *
 * 목적은 둘이다.
 *
 * 1. `noPropertyAccessFromIndexSignature` 아래에서도 **점 표기 접근을 유지**한다.
 *    Next.js 컴파일러는 `process.env.NEXT_PUBLIC_FOO` 형태의 멤버 표현식만
 *    빌드 시 리터럴로 인라인한다 — `process.env['NEXT_PUBLIC_FOO']`로 바꾸면
 *    브라우저 번들에서 빈 `process.env`를 읽어 undefined가 된다. 그래서 이
 *    키들은 색인 시그니처가 아닌 선언된 프로퍼티여야 한다.
 * 2. 앱이 의존하는 환경변수 계약을 한 파일에 모아 둔다.
 *
 * 전부 optional이다 — 실제로 미설정일 수 있고, 각 사용처가 폴백을 갖고 있다.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    NEXT_PUBLIC_ADMIN_EMAIL?: string;
    NEXT_PUBLIC_GISCUS_REPO?: string;
    NEXT_PUBLIC_GISCUS_REPO_ID?: string;
    NEXT_PUBLIC_GISCUS_CATEGORY?: string;
    NEXT_PUBLIC_GISCUS_CATEGORY_ID?: string;
    NEXT_PUBLIC_PR_COUNT?: string;
  }
}
