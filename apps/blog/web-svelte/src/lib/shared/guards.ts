/**
 * `unknown`을 객체로 좁히는 가드 — `@blog/content`의 `shared/guards.ts`와 **같은
 * 판정**이어야 한다.
 *
 * 사본을 두는 이유는 그 배럴이 `node:fs`를 함께 열어서, 클라이언트에서 들이면
 * fs·path·url이 브라우저용 빈 스텁으로 externalize되기 때문이다. URL 계약과
 * 날짜 계산은 그래서 전용 문(`@blog/content/urls`·`/dates`)을 냈지만, 이 술어는
 * 계약이 아니라 타입 좁히기 세 줄이라 문을 낼 값이 없다.
 *
 * **`!Array.isArray`를 반드시 함께 둔다.** `typeof [] === 'object'`라 빼면 배열이
 * 통과한다. 저 파일이 존재하는 이유가 정확히 이 한 줄이 자리마다 달랐던
 * 사고다 — 같은 이름의 가드 일곱 개 중 둘만 갖고 있었다. 사본을 만들 때 느슨한
 * 쪽으로 적으면 그 사고를 그대로 재현한다(이 파일의 초안이 실제로 그랬다).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
