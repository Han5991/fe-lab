/**
 * 본문 글자 수 기반 읽기 시간(분) — 한글/영문 혼재 가정.
 * `apps/blog/web/scripts/build-content.ts`와 같은 환산식 (500자/분).
 */
export function estimateReadMin(content: string): number {
  return Math.max(1, Math.ceil(content.length / 500));
}

/**
 * `2026-04-28` → `2026.04.28`
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.replaceAll('-', '.');
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
