/**
 * `unknown`을 객체로 좁히는 한 줄 — **클라이언트 그래프용 사본이다.**
 *
 * 같은 함수가 `@blog/content`(`shared/guards.ts`)에 있지만, 그 배럴은
 * `node:fs`를 함께 열어서 클라이언트에서 들이면 fs·path·url이 브라우저용 빈
 * 스텁으로 externalize된다. URL 계약은 그래서 전용 문(`@blog/content/urls`)을
 * 냈지만, 이 술어는 계약이 아니라 **타입 좁히기 한 줄**이라 문을 낼 값이 없다 —
 * 사본이 갈릴 여지도 없다(`typeof`와 `null` 검사가 전부다).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
