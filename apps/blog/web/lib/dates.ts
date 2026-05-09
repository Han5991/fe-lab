/**
 * KST(한국 표준시, UTC+9) 기준 날짜 헬퍼.
 *
 * Supabase RPC들은 viewed_at을 KST로 묶어서 view_date를 반환합니다
 * (`apps/blog/web/supabase/migrations/20260224000000_fix_kst_timezone.sql`).
 * 클라이언트에서 'today/recent7/30d' 같은 윈도우를 만들 때도 KST 기준이어야
 * RPC 결과와 1대1로 매칭됩니다.
 */

/**
 * 주어진 시점(`d`)의 KST 달력 날짜를 `YYYY-MM-DD`로 반환.
 *
 * 직접 `setHours(0,0,0,0)` + `toISOString()` 같이 짜면 브라우저 TZ에 따라
 * 0~1일 시프트가 발생합니다. 항상 이 헬퍼를 사용하세요.
 */
export function getKSTDateISO(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * `YYYY-MM-DD` 문자열에 일수를 더합니다.
 * (UTC 자정 기준으로 더해 다른 TZ 영향 없음.)
 */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 두 `YYYY-MM-DD` 사이의 일수 차(b - a). 같은 날이면 0.
 */
export function diffDaysISO(a: string, b: string): number {
  const ms =
    new Date(`${b}T00:00:00Z`).getTime() -
    new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86400000);
}

/**
 * `YYYY-MM-DD` → `M/D` 차트 X축용 짧은 라벨.
 *
 * `new Date('YYYY-MM-DD').getMonth()`는 입력 문자열을 UTC 자정으로 파싱한 뒤
 * 로컬 TZ 게터를 호출하므로, UTC보다 뒤처진 TZ에서 하루 앞당겨 표시됩니다.
 * 문자열 슬라이스로 처리해 TZ 영향 없이 KST 날짜 그대로 출력합니다.
 */
export function formatMonthDayISO(iso: string): string {
  // iso 예: "2026-05-09" → "5/9"
  const [, mm, dd] = iso.split('-');
  return `${Number(mm)}/${Number(dd)}`;
}
