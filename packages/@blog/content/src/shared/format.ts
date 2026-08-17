/**
 * 본문 글자 수 기반 읽기 시간(분) — 한글/영문 혼재 가정.
 * 로더(`src/post/repository.ts`의 `parsePost`)가 `readMin`을 계산할 때 쓴다 (500자/분).
 */
export function estimateReadMin(content: string): number {
  return Math.max(1, Math.ceil(content.length / 500));
}

/**
 * 목록·메타에 찍는 날짜 표기. `2026-04-28` → `2026-04-28`.
 *
 * 예전에는 점 표기(`2026.04.28`)로 바꿨는데, 리뉴얼 디자인 시안이 홈과 글 상세
 * 모두 하이픈이었다. 글 상세 헤더가 하이픈으로 바뀌면서 같은 사이트 안에서 두
 * 표기가 섞였고, 하이픈으로 통일했다. 함수를 없애지 않은 건 null 가드와
 * "날짜 표기는 여기 한 곳에서 정한다"는 단일 지점을 유지하기 위해서다.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  // frontmatter의 `date`는 날짜만일 수도, `2026-03-16T09:00:00+09:00` 같은
  // datetime일 수도 있다(예약 발행 글). 날짜 부분만 잘라 내는 책임을 여기서
  // 지지 않으면 소비처마다 `.slice(0, 10)`이 흩어지고, 빠뜨린 곳은 목록에
  // ISO 문자열이 통째로 찍힌다. 표기 규칙은 이 함수 하나만 안다.
  return iso.slice(0, 10);
}

/**
 * 1234 → '1.2K', 84210 → '84.2K', 999_999 → '1M', 1_500_000 → '1.5M'.
 *
 * 999_500 이상은 K가 1000K로 반올림되는 걸 막기 위해 미리 M으로 promote합니다.
 * 정수 K/M은 trailing `.0`을 떼서 `1.0K` 대신 `1K`로 표기합니다.
 */
export function fmtNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 999_500) {
    return `${(n / 1000).toFixed(1)}K`.replace(/\.0K$/, 'K');
  }
  return `${(n / 1_000_000).toFixed(1)}M`.replace(/\.0M$/, 'M');
}
