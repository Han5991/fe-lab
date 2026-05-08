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
 * 1234 → '1.2K', 84210 → '84.2K'
 */
export function fmtNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k.toFixed(k >= 10 ? 1 : 1)}K`.replace(/\.0K$/, 'K');
  }
  return `${(n / 1_000_000).toFixed(1)}M`;
}
