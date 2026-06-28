/**
 * `<script type="application/ld+json">` 본문에 안전하게 넣을 JSON 문자열을 만든다.
 *
 * `JSON.stringify`는 `<`를 그대로 두기 때문에, 값에 `</script>`(태그 조기 종료)나
 * `<!--`(HTML 주석 시작)가 들어가면 스크립트 블록이 깨지거나 XSS로 이어질 수 있다.
 * `<` 한 글자만 유니코드 이스케이프(`\\u003c`)로 바꾸면 두 시퀀스가 모두 무력화된다.
 * JSON 구조 문자에는 `<`가 없어 치환은 항상 문자열 값 내부에서만 일어나므로, 다시
 * 파싱하면 원래 값과 동일하다(의미 보존). Next.js 내부도 같은 패턴을 쓴다.
 *
 * 현재 JSON-LD는 전부 상수라 실제 악용은 없지만, 필드가 외부 데이터와 연결되는 순간을
 * 대비한 구조적 하드닝이다.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
