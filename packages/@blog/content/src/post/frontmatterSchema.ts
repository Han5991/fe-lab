/**
 * frontmatter **필드 서술자 테이블** — 키 목록의 단일 출처.
 *
 * 예전에는 키 하나를 더하려면 네 곳을 손으로 맞춰야 했습니다:
 * (1) `types.ts`의 `RawFrontmatter`, (2) `repository.ts`의 `parsePost` 좁히기,
 * (3) `src/scripts/validate-posts.ts`의 허용 키 집합, (4) 루트 `AGENTS.md`의 표.
 * 넷은 실제로 서로 **다른 순서**를 들고 있었고, 어긋나도 아무것도 깨지지 않았습니다.
 *
 * 지금은 (1)이 이 테이블에서 파생되고(`RawFrontmatter`), (3)이 이 테이블을 읽고,
 * (4)는 `frontmatterSchema.test.ts`가 이 테이블의 `doc`과 글자 단위로 대조합니다.
 * (2)만은 여전히 손으로 쓴 코드입니다 — 그 이유는 아래 `narrow` 설명에 적어
 * 두었습니다.
 *
 * **새 키를 추가할 때는 여기 한 줄 + AGENTS.md 표 한 줄 + parsePost 한 줄**이면
 * 됩니다. 셋 중 하나만 하면 컴파일이나 테스트가 막습니다.
 *
 * lint 전용 정보(`REJECTED_FRONTMATTER_KEYS`의 거부 사유)가 도메인에 있는 것이
 * 어색해 보일 수 있는데, 다이어그램 이름 목록과 같은 계열의 판단입니다 — 검증
 * 스크립트와 런타임이 **같은 목록**을 봐야 하고, 목록을 스크립트 쪽에 두면
 * 도메인이 그걸 볼 수 없습니다(의존 방향이 뒤집힙니다).
 */
import type { TimezoneConfig } from '../shared/contentConfig.ts';
import { isValidDateString, toIsoStringInOffset } from '../shared/dates.ts';
import type { PostStatus } from './types.ts';
import { isPostStatus } from './visibility.ts';

// ---------- 좁히기 함수 ----------
//
// 원래 repository.ts에 있던 함수들입니다. 서술자 테이블과 parsePost가 **같은
// 함수**를 가리켜야 "테이블이 선언한 좁히기"와 "실제로 도는 좁히기"가 갈라지지
// 않으므로 여기로 옮겼습니다.
//
// `src/post/index.ts` 배럴에는 날짜 좁히기(`toDateString`·`toScheduledDate`)만
// 올립니다 — 배럴은 "밖에서 쓸 것"만 큐레이션하는 표면이고(index.ts의 주석 참고),
// 나머지는 도메인 안에서 parsePost와 이 테이블만 씁니다.

/**
 * frontmatter의 date/updatedAt 값을 문자열(또는 null)로 정규화합니다.
 * - 문자열이고 받는 형식(`isValidDateString`: `'YYYY-MM-DD'` 또는 offset을 적은
 *   ISO datetime)이면 → 그대로
 * - 그 밖의 문자열(`'2026-5-4'`, `'2026/05/04'`, offset 없는 datetime …) → null.
 *   예전에는 그대로 흘러가서 실행 환경의 TZ에 따라 공개 시각이 9시간 갈렸고,
 *   JSON-LD에는 `2026-5-4T00:00:00+09:00` 같은 깨진 ISO가 나갔습니다. null이면
 *   예약 글은 공개 시각이 없어 비공개(fail-closed)이고, 날짜를 쓰는 소비처는
 *   전부 "날짜 없음"을 이미 처리합니다. 원문은 lint:posts가 에러로 알립니다.
 * - YAML이 Date 객체로 파싱한 경우 → 아래 규칙
 * - 그 외 → null
 *
 * 따옴표 없는 날짜는 YAML이 Date로 바꿔 줍니다. 두 모양이 들어옵니다:
 * - `date: 2025-01-02` → UTC 자정 Date. 적힌 날짜 그대로 `'2025-01-02'`.
 * - `date: 2026-10-01T08:00:00+09:00` → 시각이 있는 Date. 예전에는 여기서도
 *   `toISOString()`의 앞 10자(= **UTC** 날짜)를 잘라 `'2026-09-30'`이 됐고,
 *   예약 글이 KST 자정 기준으로 최대 33시간 일찍 공개됐습니다. 이제 설정
 *   타임존의 offset으로 시점을 그대로 적습니다(`'2026-10-01T08:00:00+09:00'`) —
 *   따옴표를 친 같은 값과 똑같은 문자열이라, 앞 10자는 사이트 타임존의 달력
 *   날짜이고 공개 시각도 적힌 시각 그대로입니다.
 *
 * UTC 자정에 정확히 떨어지는 datetime(KST라면 `T09:00:00+09:00`)은 날짜만 쓴 값과
 * 구분할 수 없어 날짜로 읽힙니다 — lint:posts가 따옴표 없는 datetime을 막는 이유.
 *
 * `timezone`을 주지 않으면 시점을 UTC(`Z`)로 적습니다(공개 판정만 필요한 곳용).
 */
export function toDateString(
  value: unknown,
  timezone?: Pick<TimezoneConfig, 'isoOffset'>,
): string | null {
  if (value instanceof Date) return fromYamlDate(value, timezone);
  if (typeof value === 'string') return isValidDateString(value) ? value : null;
  return null;
}

/** YAML이 만든 Date → 문자열. 위 `toDateString`의 규칙 본체. */
function fromYamlDate(
  value: Date,
  timezone: Pick<TimezoneConfig, 'isoOffset'> | undefined,
): string | null {
  if (Number.isNaN(value.getTime())) return null;
  const iso = value.toISOString();
  // 날짜만 쓴 값(`2025-01-02`)은 UTC 자정 Date가 된다 — 적힌 날짜 그대로.
  const result = iso.endsWith('T00:00:00.000Z')
    ? iso.slice(0, 10)
    : toIsoStringInOffset(value, timezone?.isoOffset ?? 'Z');
  // 0000~9999년 밖(`+010000-…`)처럼 받는 형식을 벗어나면 없는 값으로 본다.
  return isValidDateString(result) ? result : null;
}

/**
 * `scheduledDate`를 좁힙니다. `date`와 달리 **형식이 틀린 문자열도 버리지 않습니다.**
 *
 * 공개 시각은 `scheduledDate ?? date`라서, 틀린 값을 없는 값으로 떨어뜨리면
 * 공개 시각이 `date`(보통 그날 자정)로 폴백해 **의도보다 일찍** 공개됩니다
 * (fail-open). 원문 그대로 두면 `isPostVisible`이 형식을 인정하지 않아 비공개로
 * 닫히고(fail-closed), dev 배너에도 저자가 쓴 값이 그대로 보입니다.
 *
 * 따옴표 없는 datetime(YAML Date)은 `date`와 같은 규칙으로 시점을 보존해
 * 적습니다 — lint:posts의 공개 판정(`isVisibleFrontmatter`)이 이미 그렇게 읽고
 * 있어서, 예전처럼 로더만 값을 버리면 두 판정이 갈렸습니다.
 */
export function toScheduledDate(
  value: unknown,
  timezone?: Pick<TimezoneConfig, 'isoOffset'>,
): string | undefined {
  // 변환할 수 없는 Date는 원문 표기('Invalid Date')로 남겨 비공개로 닫는다.
  if (value instanceof Date)
    return fromYamlDate(value, timezone) ?? String(value);
  return toOptionalString(value);
}

/** 문자열이 아니면 undefined. 빈 문자열은 값이 없는 것으로 취급합니다. */
export function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * `tags`를 string[]로 좁히고 **중복을 제거**합니다. 배열이 아니거나 문자열 아닌
 * 원소가 섞이면 undefined — validate-posts의 invalid-tags 규칙이 별도로 에러를 냅니다.
 *
 * 태그는 의미상 집합입니다. 중복이 그대로 흘러가면 글 메타에 `#ci #ci`가 두 번
 * 찍히고, `getAllTags()`의 개수가 부풀고, 목록 렌더에서 React key가 충돌합니다.
 * 세 증상 모두 원인이 하나라 여기서 한 번만 정규화합니다.
 * (frontmatter에 중복이 남아 있다는 사실 자체는 lint:posts가 경고로 알립니다.)
 */
export function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every(item => typeof item === 'string')
    ? Array.from(new Set(value))
    : undefined;
}

/**
 * `status`를 PostStatus로 좁힙니다. enum 밖 값은 undefined입니다.
 *
 * parsePost는 이 함수 대신 `isPostFile` **타입 가드**를 씁니다 — 유효한 status가
 * 없으면 그 파일은 애초에 포스트가 아니라서(빌드에서 통째로 제외) 값 좁히기가
 * 아니라 조기 반환의 문제이기 때문입니다. 두 경로 모두 `isPostStatus` 하나를
 * 봅니다.
 */
export function toPostStatus(value: unknown): PostStatus | undefined {
  return isPostStatus(value) ? value : undefined;
}

// ---------- 서술자 테이블 ----------

/** 값의 종류. 문서용 라벨이자 `narrow`가 무엇을 돌려주는지에 대한 요약입니다. */
export type FrontmatterKind = 'string' | 'date' | 'string-array' | 'enum';

export interface FrontmatterField {
  /**
   * 없으면 `lint:posts`가 막는 키인가.
   *
   * **검사 로직을 여기서 파생하지는 않습니다.** 필수 3개는 각각
   * `meta-file-skipped`(status) · `missing-title`(title) · `missing-date`(date)로
   * 규칙 이름도 심각도도 메시지도 다릅니다. 한 루프로 뭉치면 그 셋이 하나의
   * 뭉뚱그린 메시지가 됩니다. 이 필드는 문서(표)와 사람이 읽는 용도입니다.
   */
  required: boolean;
  kind: FrontmatterKind;
  /**
   * 이 키의 원시 값을 좁히는 함수.
   *
   * `parsePost`를 이 테이블 루프로 바꾸지 않은 이유가 여기 있습니다 — 11개 중
   * 다섯이 단순 좁히기가 아닙니다. `slug`는 파일 경로(rawSlug)로, `title`은
   * 파일명으로, `excerpt`는 본문 앞부분 자동 발췌로 폴백하고, `date`/`updatedAt`은
   * `string | null`로 "없음"을 구분해 들고 갑니다. 루프로 만들면 이 폴백들이
   * 테이블의 예외 필드로 흩어져 repository.ts의 지금 모양보다 읽기 나빠집니다.
   *
   * 대신 양방향으로 잠급니다:
   * - parsePost가 **테이블 밖 키**를 읽으면 → `RawFrontmatter`가 컴파일 에러
   * - 테이블에만 있고 parsePost가 **안 읽는 키**면 → `frontmatterSchema.test.ts`의
   *   왕복 프로브(키를 하나씩 빼서 parsePost 결과가 달라지는지)가 실패
   */
  narrow: (value: unknown) => unknown;
  /**
   * 루트 `AGENTS.md`의 frontmatter 표 설명 셀 **원문**.
   *
   * 표를 생성하지 않는 대신 `frontmatterSchema.test.ts`가 이 문자열과 표를
   * 글자 단위로 대조합니다. 오타 하나를 고칠 때도 두 파일을 함께 고쳐야 하는
   * 결합이 생기지만, 표가 조용히 낡는 것보다 낫다는 판단입니다.
   * (표에서 `\|`로 이스케이프된 파이프는 여기서는 그냥 `|`입니다.)
   */
  doc: string;
}

/**
 * 키 순서는 **AGENTS.md 표와 같습니다**(필수 먼저). 동기화 테스트가 순서까지
 * 비교하므로, 사람이 읽는 표 쪽을 정본으로 삼았습니다.
 */
export const FRONTMATTER_FIELDS = {
  status: {
    required: true,
    kind: 'enum',
    narrow: toPostStatus,
    doc: '`published` | `draft` | `scheduled`. **이 키가 없으면 포스트가 아니라 메타 노트로 간주되어 빌드에서 통째로 제외됩니다.**',
  },
  title: {
    required: true,
    kind: 'string',
    narrow: toOptionalString,
    doc: '없으면 파일명으로 폴백하지만 `lint:posts`가 에러',
  },
  seoTitle: {
    required: false,
    kind: 'string',
    narrow: toOptionalString,
    doc: '**`<title>` 전용**의 짧은 제목. 화면 제목·OG 카드·JSON-LD headline은 계속 `title`을 쓴다. `{seoTitle ?? title} | {site.name}`이 seo.titleMaxLength(기본 60자)를 넘으면 `lint:posts`가 `long-title` 경고',
  },
  date: {
    required: true,
    kind: 'date',
    narrow: toDateString,
    doc: "`'YYYY-MM-DD'`. 목록 정렬·아카이브·sitemap·RSS가 모두 사용하고, `scheduled`일 때는 공개 시각이기도 함. 없으면 `missing-date` 에러",
  },
  slug: {
    required: false,
    kind: 'string',
    narrow: toOptionalString,
    doc: 'URL. 없으면 파일 경로에서 유도',
  },
  excerpt: {
    required: false,
    kind: 'string',
    narrow: toOptionalString,
    doc: 'meta description. **사실상 필수** — 없으면 본문 앞 160자 자동 발췌가 나가는데, 도입부가 비슷한 글끼리 description이 글자 단위로 겹친다(`missing-excerpt` 경고). 권장 120~160자(`excerpt-length` 경고)',
  },
  thumbnail: {
    required: false,
    kind: 'string',
    narrow: toOptionalString,
    doc: '없으면 빌드 시 OG 카드(`/og/{slug}.png`) 자동 생성',
  },
  hero: {
    required: false,
    kind: 'string',
    narrow: toOptionalString,
    doc: '히어로 슬롯에 꽂을 **등록된 다이어그램 이름**(현재 `deploy-pipeline`). 있으면 썸네일 대신 이 SVG가 그려진다. 렌더는 fail-soft(미등록 → 썸네일 폴백)지만 `lint:posts`가 `unknown-hero-diagram` 에러로 막는다',
  },
  tags: {
    required: false,
    kind: 'string-array',
    narrow: toStringArray,
    doc: '문자열 배열. 문자열 아닌 원소가 섞이면 태그 전체가 무시됨',
  },
  updatedAt: {
    required: false,
    kind: 'date',
    narrow: toDateString,
    doc: 'Schema.org `dateModified`, sitemap `lastmod`에 사용',
  },
  scheduledDate: {
    required: false,
    kind: 'string',
    narrow: toScheduledDate,
    doc: '**시각까지 지정할 때만.** 날짜만이면 `date`로 충분. 이걸 써도 `date`는 여전히 필수',
  },
} as const satisfies Record<string, FrontmatterField>;

export type FrontmatterKey = keyof typeof FRONTMATTER_FIELDS;

/**
 * 테이블에 **직접** 있는 키인가.
 *
 * `Object.keys`가 `keyof`가 아니라 `string[]`을 주는 것은 TS의 의도된 후퇴입니다
 * — 런타임 객체에는 선언에 없는 키가 있을 수 있으니까요. 그래서 예전에는 키
 * 목록에 `as FrontmatterKey[]`가 붙어 있었는데, 그 단언은 후퇴를 말로만 취소할
 * 뿐 아무것도 확인하지 않습니다. 이쪽은 같은 주장을 원소마다 테이블 조회로
 * 확인합니다(`hasOwn`이라 프로토타입 체인의 이름은 통과하지 못합니다).
 */
function isFrontmatterKey(key: string): key is FrontmatterKey {
  return Object.hasOwn(FRONTMATTER_FIELDS, key);
}

/** 선언 순서(= AGENTS.md 표 순서)를 유지한 키 목록. */
export const FRONTMATTER_KEYS =
  Object.keys(FRONTMATTER_FIELDS).filter(isFrontmatterKey);

/**
 * frontmatter를 파싱한 **직후**의 원시 형태.
 *
 * gray-matter의 `data`는 `{ [key: string]: any }`라서 그대로 쓰면
 * `data.tags.map(...)`이나 `data.date.getTime()` 같은 코드가 컴파일은 통과하고
 * 런타임에 터집니다. YAML은 어떤 타입이든 줄 수 있으므로(`date: null`,
 * `tags: 'a'`, `status: 3` …) 모든 값을 `unknown`으로 받고 읽는 쪽에서 좁힙니다.
 *
 * 서술자 테이블의 키에서 **파생**됩니다. 매핑 타입이라 "전 필드 unknown"이라는
 * 성질이 그대로 유지되면서, 테이블에 없는 키를 읽으려는 코드는 컴파일이 깨집니다.
 *
 * 여기 없는 키는 validate-posts의 unknown-frontmatter-key 경고 대상입니다.
 */
export type RawFrontmatter = Partial<Record<FrontmatterKey, unknown>>;

/**
 * **일부러 허용 목록에서 뺀** 키와 그 사유.
 *
 * 예전에는 이 정보가 `validate-posts.ts`의 주석에만 있어서, 경고를 받은 글쓴이는
 * "알 수 없는 키"라는 말만 보고 왜 안 되는지는 소스를 열어야 알 수 있었습니다.
 * 사유를 값으로 들고 있으면 그대로 lint 메시지에 실립니다.
 *
 * `published`는 예외적으로 unknown-frontmatter-key를 내지 않습니다 — 같은 키에
 * 대해 legacy-published-field(에러)가 이미 더 정확한 메시지를 내고 있어서
 * "알 수 없는 키다"라는 말이 사실과도 어긋납니다(모르는 키가 아니라 아는 폐기
 * 키입니다). 그 분기는 scripts/validate/frontmatter.ts의 unknownKeyChain에 있습니다.
 */
export const REJECTED_FRONTMATTER_KEYS = {
  published:
    '`status`로 통합됐습니다. legacy-published-field 규칙이 에러로 잡습니다. (`status`와 공존하면 조용히 무시되는 구조였습니다)',
  description: '`excerpt`와 역할이 겹치는데 어떤 코드도 읽지 않습니다.',
  draft: '읽는 코드가 없는 유령 키입니다. 초안은 `status: draft`로 표시합니다.',
  category: '읽는 코드가 없는 유령 키입니다. 분류는 `tags` 또는 폴더를 씁니다.',
  series:
    '시리즈는 폴더 경로로 결정됩니다(repository.ts). frontmatter 값은 무시됩니다.',
  order:
    '`_series.yml` 전용 키입니다. (collectMarkdownFiles가 `.yml`을 수집하지 않아 마크다운 frontmatter 검사에는 애초에 들어오지 않습니다)',
} as const satisfies Record<string, string>;

export type RejectedFrontmatterKey = keyof typeof REJECTED_FRONTMATTER_KEYS;

/**
 * 거부 목록에 **직접** 있는 키인가. 위 `isFrontmatterKey`와 같은 이유로 술어이고,
 * `hasOwn`이라 `toString` 같은 프로토타입 이름은 걸리지 않습니다.
 */
function isRejectedFrontmatterKey(key: string): key is RejectedFrontmatterKey {
  return Object.hasOwn(REJECTED_FRONTMATTER_KEYS, key);
}

/** 거부 사유를 찾습니다. 그냥 오타인 키는 undefined입니다. */
export function rejectionReasonFor(key: string): string | undefined {
  return isRejectedFrontmatterKey(key)
    ? REJECTED_FRONTMATTER_KEYS[key]
    : undefined;
}
