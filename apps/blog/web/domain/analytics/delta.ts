/**
 * 증감율 계산의 단일 출처.
 *
 * 예전에는 `previous > 0 ? (current - previous) / previous : null` 세 벌이
 * 따로 있었다 — 전체 조회수, 고유 방문자 추정, 상위 글 목록. 공식이 흩어지면
 * "직전이 0일 때 무엇을 돌려주나"가 지표마다 갈리고, 화면의 어떤 칸은 `+∞`,
 * 어떤 칸은 `–`가 된다.
 */

/**
 * 직전 값 대비 증감율(비율. 0.25 = +25%).
 *
 * 직전이 0 이하면 **null**이다 — 0에서 늘어난 것은 비율로 말할 수 없다.
 * 화면은 null을 "비교 불가"로 그린다(증가 0%가 아니다).
 */
export function percentDelta(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}
