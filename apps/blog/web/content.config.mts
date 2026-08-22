/**
 * 이 앱의 콘텐츠 파이프라인 설정 — `blog-content` CLI와 앱 코드가 함께 읽는
 * 단일 출처.
 *
 * `root: import.meta.url`이 계약의 핵심이다: **이 파일의 위치가 경로 앵커**라서
 * `dirs.*`(기본값: `../posts`, `public`, …)가 전부 여기 기준으로 풀린다.
 * CLI는 cwd에서 위로 올라가며 이 파일을 찾고(pnpm 스크립트의 cwd가 앱
 * 디렉터리라 항상 잡힌다), 앱은 `src/content.ts`가 정적 import한다.
 * 확장자가 `.mts`인 이유: 이 앱 package.json에 `"type": "module"`이 없어
 * `.ts`면 node가 CommonJS로 파싱했다가 ESM으로 재파싱한다(경고 + 오버헤드).
 *
 * 서버/빌드 전용 — 클라이언트 컴포넌트 그래프로 import하지 말 것.
 * 기본값이 곧 현재 사이트의 값이라 여기엔 root만 적는다.
 */
import { defineContent } from '@blog/content';

export default defineContent({
  root: import.meta.url,
});
