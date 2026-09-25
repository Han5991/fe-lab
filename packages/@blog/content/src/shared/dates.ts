/**
 * KST(한국 표준시, UTC+9) 기준 날짜 헬퍼.
 *
 * Supabase RPC들은 viewed_at을 KST로 묶어서 view_date를 반환합니다
 * (`apps/blog/web/supabase/migrations/20260224000000_fix_kst_timezone.sql`).
 * 클라이언트에서 'today/recent7/30d' 같은 윈도우를 만들 때도 KST 기준이어야
 * RPC 결과와 1대1로 매칭됩니다.
 *
 * 타임존 식별자(IANA 이름·ISO offset·ms 오프셋)는 **인자로 받습니다** —
 * 해석된 설정의 `timezone` 슬라이스, 또는 앱 값 모듈의 `TIMEZONE`을 그대로
 * 넘기면 됩니다. 예전에는 모듈 스코프 리터럴을 직접 읽어서, 설정으로 타임존을
 * 덮어도 이 헬퍼들만 옛 값을 보고 있었습니다.
 *
 * 이 헬퍼들은 admin 클라이언트 컴포넌트가 쓰므로 설정 **객체**를 값으로
 * import하면 안 됩니다(번들 누출) — 타입만 가져옵니다.
 *
 * 이름의 `KST`는 이 저장소가 실제로 쓰는 타임존을 가리키는 관용 이름으로
 * 남겨 뒀습니다. 계산 자체는 넘겨받은 타임존을 따릅니다.
 */
import type { TimezoneConfig } from './contentConfig.ts';

/**
 * 주어진 시점(`d`)의 KST 달력 날짜를 `YYYY-MM-DD`로 반환.
 *
 * 직접 `setHours(0,0,0,0)` + `toISOString()` 같이 짜면 브라우저 TZ에 따라
 * 0~1일 시프트가 발생합니다. 항상 이 헬퍼를 사용하세요.
 */
export function getKSTDateISO(
  timezone: Pick<TimezoneConfig, 'iana'>,
  d: Date = new Date(),
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone.iana,
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
 * ISO offset 문자열(`'+09:00'`·`'-05:30'`·`'Z'`)을 UTC 대비 밀리초로 바꿉니다.
 * 형식이 아니면 null — `'+9:00'`·`'Asia/Seoul'`처럼 날짜 뒤에 붙였을 때
 * Invalid Date가 되는 값을 걸러 내는 데 씁니다.
 */
export function parseIsoOffset(isoOffset: string): number | null {
  if (isoOffset === 'Z') return 0;
  const match = /^([+-])([01]\d|2[0-3]):([0-5]\d)$/.exec(isoOffset);
  if (!match) return null;
  const [, sign, hours, minutes] = match;
  const ms = (Number(hours) * 60 + Number(minutes)) * 60_000;
  return sign === '-' ? -ms : ms;
}

/**
 * 시점(`d`)을 주어진 offset의 벽시계로 적은 ISO 8601 문자열로 만듭니다.
 * 예: `2026-09-30T23:00:00Z`, `'+09:00'` → `'2026-10-01T08:00:00+09:00'`.
 *
 * `toISOString()`과 같은 시점을 가리키지만 앞 10자가 **그 타임존의 달력 날짜**라,
 * 날짜만 잘라 쓰는 소비처(`fmtDate`)도 하루 밀린 날짜를 보지 않습니다.
 * offset이 형식에 맞지 않으면 던집니다(설정 검증을 통과한 값만 들어온다는 전제).
 */
export function toIsoStringInOffset(d: Date, isoOffset: string): string {
  const offsetMs = parseIsoOffset(isoOffset);
  if (offsetMs === null) {
    throw new Error(`toIsoStringInOffset: 잘못된 ISO offset '${isoOffset}'`);
  }
  const shifted = new Date(d.getTime() + offsetMs);
  const ms = shifted.getUTCMilliseconds();
  const fraction = ms === 0 ? '' : `.${String(ms).padStart(3, '0')}`;
  return `${shifted.toISOString().slice(0, 19)}${fraction}${isoOffset}`;
}

// ── 날짜 문자열 형식 ──────────────────────────────────────────────────────────
//
// frontmatter의 날짜는 **두 모양만** 받습니다. 나머지(`'2026-5-4'`, `'2026/05/04'`,
// 공백 구분 datetime, offset 없는 datetime …)는 `Date.parse`가 받아 주더라도
// 엔진·실행 환경의 TZ에 따라 다른 시점이 되고, 뒤에 `T00:00:00+09:00`를 붙이는
// 소비처(JSON-LD)에서 깨진 ISO가 됩니다. 로더와 lint:posts가 같은 판정을 쓰도록
// 여기 한 곳에 둡니다.

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_WITH_OFFSET =
  /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

/** `'YYYY-MM-DD'`가 달력에 실제로 있는 날짜인가(`'2026-02-30'`은 아니다). */
function isCalendarDate(ymd: string): boolean {
  const d = new Date(`${ymd}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === ymd;
}

/** 날짜만 적은 `'YYYY-MM-DD'`이고 실제 달력 날짜인가. */
export function isIsoDateOnly(value: string): boolean {
  return ISO_DATE_ONLY.test(value) && isCalendarDate(value);
}

/**
 * offset(`Z` 또는 `±HH:MM`)까지 적은 ISO 8601 datetime인가
 * (`'2026-05-24T09:00:00+09:00'`, `'2026-05-24T00:00Z'`, 밀리초 선택).
 * offset 없는 datetime은 실행 환경의 로컬 타임으로 해석되므로 받지 않습니다.
 */
export function isIsoDateTimeWithOffset(value: string): boolean {
  const match = ISO_DATETIME_WITH_OFFSET.exec(value);
  return (
    match?.[1] !== undefined &&
    isCalendarDate(match[1]) &&
    !Number.isNaN(Date.parse(value))
  );
}

/**
 * frontmatter 날짜(`date`·`updatedAt`·`scheduledDate`)로 받는 형식인가 —
 * `'YYYY-MM-DD'` 또는 offset을 명시한 ISO datetime. 로더는 이 밖의 값을 공개
 * 시각으로 인정하지 않고(fail-closed), lint:posts도 같은 함수로 판정합니다.
 */
export function isValidDateString(value: string): boolean {
  return isIsoDateOnly(value) || isIsoDateTimeWithOffset(value);
}

/**
 * scheduledDate / post.date 문자열을 KST 기준 Date로 파싱합니다.
 *
 * ## 지원 입력 형식 (`isValidDateString`)
 * - `'YYYY-MM-DD'` (시간 없음): JS Date는 UTC 자정으로 해석하지만,
 *   블로그 규칙상 이 형식은 KST 날짜이므로 `T00:00:00+09:00`를 붙여
 *   KST 자정(= UTC 전날 15:00)으로 변환합니다.
 * - ISO 8601 with timezone offset (예: `'2026-05-24T09:00:00+09:00'`,
 *   `'2026-05-24T00:00:00Z'`): 그대로 파싱합니다.
 *
 * ## 그 밖의 입력 → Invalid Date
 * - `'YYYY-MM-DDTHH:mm:ss'`(offset 없는 datetime)는 ECMAScript 스펙상 *로컬
 *   타임*이라 개발자 머신(KST)과 빌드 서버(UTC)에서 다른 시점이 됩니다.
 * - `'2026-5-4'`·`'2026/05/04'` 같은 비표준 모양은 `Date.parse`가 받아 주더라도
 *   엔진 재량이고, 역시 로컬 타임으로 읽혀 TZ에 따라 9시간씩 갈립니다.
 * 예전에는 이런 값도 `new Date(input)`로 넘겨 **환경마다 다른 공개 시각**이
 * 됐습니다. 지금은 Invalid Date라 `isPostVisible`이 비공개로 닫습니다(NaN과의
 * 비교는 언제나 false). 호출부가 결과를 출력한다면 `getTime()`의 NaN을 확인할 것.
 *
 * @example
 * parseScheduledDateKST(TIMEZONE, '2026-05-24')
 * // → Date("2026-05-23T15:00:00Z")  ← KST 자정 = UTC 전날 15시
 *
 * parseScheduledDateKST(TIMEZONE, '2026-05-24T09:00:00+09:00')
 * // → Date("2026-05-24T00:00:00Z")
 */
export function parseScheduledDateKST(
  timezone: Pick<TimezoneConfig, 'isoOffset'>,
  input: string,
): Date {
  if (isIsoDateOnly(input)) {
    return new Date(`${input}T00:00:00${timezone.isoOffset}`);
  }
  if (isIsoDateTimeWithOffset(input)) return new Date(input);
  return new Date(Number.NaN);
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
 * getKSTCutoffDate(TIMEZONE, '7days', '2026-05-25')  // → '2026-05-18'
 * getKSTCutoffDate(TIMEZONE, '30days', '2026-05-25') // → '2026-04-25'
 */
export function getKSTCutoffDate(
  timezone: Pick<TimezoneConfig, 'iana'>,
  filterType: '7days' | '30days',
  todayKST?: string,
): string {
  const today = todayKST ?? getKSTDateISO(timezone);
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
export function msUntilKSTMidnight(
  timezone: Pick<TimezoneConfig, 'utcOffsetMs'>,
  now: Date = new Date(),
): number {
  const kstOffset = timezone.utcOffsetMs;
  const nowKST = now.getTime() + kstOffset;
  const midnightKST = Math.ceil(nowKST / 86400000) * 86400000;
  return midnightKST - nowKST + 60_000;
}
