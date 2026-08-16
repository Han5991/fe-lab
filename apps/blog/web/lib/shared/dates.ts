/**
 * KST(한국 표준시, UTC+9) 기준 날짜 헬퍼.
 *
 * Supabase RPC들은 viewed_at을 KST로 묶어서 view_date를 반환합니다
 * (`apps/blog/web/supabase/migrations/20260224000000_fix_kst_timezone.sql`).
 * 클라이언트에서 'today/recent7/30d' 같은 윈도우를 만들 때도 KST 기준이어야
 * RPC 결과와 1대1로 매칭됩니다.
 *
 * 타임존 식별자(IANA 이름·ISO offset·ms 오프셋)는 값-only 모듈
 * (`contentValues.ts`)에서 옵니다 — 셋이 같은 타임존을 가리켜야 합니다.
 * 이 헬퍼들은 admin 클라이언트 컴포넌트가 쓰므로 설정 객체
 * (`contentConfig.ts`)를 import하면 안 됩니다(번들 누출).
 */
import {
  TIMEZONE_IANA,
  TIMEZONE_ISO_OFFSET,
  TIMEZONE_UTC_OFFSET_MS,
} from './contentValues';

/**
 * 주어진 시점(`d`)의 KST 달력 날짜를 `YYYY-MM-DD`로 반환.
 *
 * 직접 `setHours(0,0,0,0)` + `toISOString()` 같이 짜면 브라우저 TZ에 따라
 * 0~1일 시프트가 발생합니다. 항상 이 헬퍼를 사용하세요.
 */
export function getKSTDateISO(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IANA,
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
    new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86400000);
}

/**
 * scheduledDate / post.date 문자열을 KST 기준 Date로 파싱합니다.
 *
 * ## 지원 입력 형식
 * - `'YYYY-MM-DD'` (시간 없음): JS Date는 UTC 자정으로 해석하지만,
 *   블로그 규칙상 이 형식은 KST 날짜이므로 `T00:00:00+09:00`를 붙여
 *   KST 자정(= UTC 전날 15:00)으로 변환합니다.
 * - ISO 8601 with timezone offset (예: `'2026-05-24T09:00:00+09:00'`,
 *   `'2026-05-24T00:00:00Z'`): 그대로 파싱합니다.
 *
 * ## 비지원 입력 (사용 시 결과 미정의)
 * - `'YYYY-MM-DDTHH:mm:ss'` (timezone offset 없는 datetime):
 *   ECMAScript 스펙상 *로컬 타임*으로 파싱되어 환경 의존이 됩니다
 *   (개발자 머신에선 KST지만 빌드 서버에선 UTC). 작성 규약에서 항상
 *   `+09:00` 또는 `Z`를 명시하거나 `'YYYY-MM-DD'` 짧은 형식을 사용하세요.
 *
 * @example
 * parseScheduledDateKST('2026-05-24')
 * // → Date("2026-05-23T15:00:00Z")  ← KST 자정 = UTC 전날 15시
 *
 * parseScheduledDateKST('2026-05-24T09:00:00+09:00')
 * // → Date("2026-05-24T00:00:00Z")
 */
export function parseScheduledDateKST(input: string): Date {
  // 'YYYY-MM-DD' 형식 여부 확인 (시간 없음)
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T00:00:00${TIMEZONE_ISO_OFFSET}`);
  }
  return new Date(input);
}

/**
 * 날짜 문자열이 `parseScheduledDateKST`로 **결정적으로** 해석되지 못하는
 * "timezone 모호한 datetime"인지 검사합니다.
 *
 * - `'YYYY-MM-DD'` (날짜만) → KST 자정으로 해석되므로 안전 (false)
 * - offset(`Z` 또는 `±HH:MM`)을 명시한 datetime → 안전 (false)
 * - `'YYYY-MM-DDTHH:mm[:ss]'` (offset 없는 datetime) → **모호** (true).
 *   ECMAScript 스펙상 *로컬 타임*으로 파싱되어 개발 머신(KST)과 빌드 서버(UTC)에서
 *   서로 다른 instant가 됩니다 → 예약 발행 시각이 ~9시간 어긋남.
 *   (commit 0e2df5a가 고친 "KST 의도를 UTC로 해석" 버그와 동일 클래스)
 *
 * @example
 * hasAmbiguousTimezone('2026-06-01')                      // false (날짜만)
 * hasAmbiguousTimezone('2026-06-01T09:00:00+09:00')       // false (offset 명시)
 * hasAmbiguousTimezone('2026-06-01T09:00:00Z')            // false (UTC)
 * hasAmbiguousTimezone('2026-06-01T09:00:00')             // true  (offset 없음)
 */
export function hasAmbiguousTimezone(input: string): boolean {
  const trimmed = input.trim();
  // 시간 성분(T 또는 공백 + HH:mm)이 없으면 날짜만 → 안전
  const hasTime = /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(trimmed);
  if (!hasTime) return false;
  // 시간이 있는데 timezone offset(Z/z 또는 ±HH:MM/±HHMM)이 없으면 모호.
  // `i` 플래그로 비표준 소문자 `z`(Date.parse는 허용)도 offset으로 인정해 오탐 방지.
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  return !hasOffset;
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

/**
 * filterType에 대응하는 KST 기준 cutoff 날짜 문자열(`YYYY-MM-DD`)을 반환합니다.
 * Supabase RPC가 KST 기준 view_date를 반환하므로 비교 기준도 KST여야 합니다.
 *
 * @param filterType - '7days' | '30days'
 * @param todayKST   - 오늘 KST 날짜 (`YYYY-MM-DD`). 미제공 시 현재 시각 기준.
 * @returns cutoff 날짜 (이 날짜 이후 데이터가 필터링 대상).
 *
 * @example
 * getKSTCutoffDate('7days', '2026-05-25')  // → '2026-05-18'
 * getKSTCutoffDate('30days', '2026-05-25') // → '2026-04-25'
 */
export function getKSTCutoffDate(
  filterType: '7days' | '30days',
  todayKST?: string,
): string {
  const today = todayKST ?? getKSTDateISO();
  if (filterType === '7days') return addDaysISO(today, -7);
  return addDaysISO(today, -30);
}

/**
 * 주어진 시점에서 다음 KST 자정까지 남은 밀리초(+60초 여유).
 *
 * 자정 정각에 OS 타이머가 약간 일찍 발화하는 경우를 대비해 60초를 더합니다.
 * useAnalyticsOverview가 자정마다 차트 윈도우를 리셋하는 setTimeout 스케줄에 씁니다.
 * now를 주입받아 결정적으로 테스트할 수 있습니다.
 */
export function msUntilKSTMidnight(now: Date = new Date()): number {
  const kstOffset = TIMEZONE_UTC_OFFSET_MS; // KST = UTC+9시간
  const nowKST = now.getTime() + kstOffset;
  const midnightKST = Math.ceil(nowKST / 86400000) * 86400000;
  return midnightKST - nowKST + 60_000;
}
