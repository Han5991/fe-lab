/**
 * frontmatter **판정 사슬** — 파일 하나의 frontmatter를 보는 체크 전부.
 *
 * 사슬 하나는 규칙 id 하나가 아니라 **판정 흐름 하나**입니다. 예컨대 excerpt
 * 사슬은 "없음/빈 값 → missing-excerpt, 있으면 말줄임 검사 → truncated-excerpt,
 * 길이 검사 → excerpt-length"를 한 흐름으로 냅니다 — 규칙 id 단위로 쪼개면
 * "있으면"이라는 공통 전제를 사슬마다 다시 검사하게 됩니다.
 *
 * 심각도는 여기 하드코딩하지 않고 전부 `rules.ts`의 평면 테이블에서 읽습니다
 * (`resolveSeverity`). 사슬이 내는 순서 = 리포트에 찍히는 순서이므로,
 * `validatePost`의 사슬 배열 순서를 바꾸면 CLI 출력 순서가 바뀝니다.
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  POST_STATUSES,
  FRONTMATTER_KEYS,
  isPostStatus,
  isPostFile,
  rejectionReasonFor,
  resolvePostSlug,
} from '../../post/index.ts';
import {
  hasAmbiguousTimezone,
  isIsoDateOnly,
  isValidDateString,
} from '../../shared/dates.ts';
import { decodeUrlSafe } from '../../shared/url.ts';
import {
  findFrontmatterLine,
  frontmatterScalar,
  isBareThumbnailName,
  slugProblem,
} from './shared.ts';
import type { Issue, PostRecord, ValidateContext } from './shared.ts';
import { resolveSeverity, type RuleId } from './rules.ts';

/**
 * 허용 키의 단일 출처는 **서술자 테이블**(src/post/frontmatterSchema.ts)입니다.
 * 예전에는 여기 손으로 쓴 Set이 따로 있어 `RawFrontmatter`와 어긋날 수 있었습니다
 * (실제로 순서가 달랐고, 어긋나도 아무것도 깨지지 않았습니다).
 *
 * 의도적으로 뺀 키(`published` · `description` · `draft` · `category` · `series` ·
 * `order`)와 각각의 거부 사유도 같은 파일의 `REJECTED_FRONTMATTER_KEYS`에
 * 데이터로 있습니다 — 사유가 주석이 아니라 값이라서 그대로 lint 메시지에 실립니다.
 */
const KNOWN_FRONTMATTER_KEYS = new Set<string>(FRONTMATTER_KEYS);

/**
 * 진단 메시지에 "무엇이 들어왔는지"를 그대로 보여 주기 위한 포매터.
 *
 * YAML 값은 임의 타입이라 `String(value)`를 그냥 쓰면 객체가 `[object Object]`가
 * 되어, 정작 알려 주려던 것 — 무엇이 들어왔나 — 을 못 알려 준다. 객체·배열은
 * JSON으로 펼치고, 순환 참조처럼 JSON이 실패하는 값만 태그로 떨어뜨린다.
 */
function describeValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value) ?? Object.prototype.toString.call(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  return String(value);
}

/** 판정 사슬 하나가 받는 것 전부. 심각도 계산에 data와 options가 함께 필요하다. */
interface FileContext {
  record: PostRecord;
  raw: string;
  options: ValidateContext;
}

type Chain = (ctx: FileContext) => Issue[];

// ── status 사슬: legacy-published-field · invalid-status ────────────────────

const statusChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const issues: Issue[] = [];

  // 폐기된 published 필드 — status로 통합됨. status와 공존하면 조용히 무시되므로 에러.
  if ('published' in data) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'published'),
      severity: resolveSeverity('legacy-published-field', data, options),
      rule: 'legacy-published-field',
      message: `\`published\`는 더 이상 쓰지 않습니다. \`status: ${POST_STATUSES.join(' | ')}\`로 바꾸세요. (\`status\`가 함께 있으면 \`published\`는 조용히 무시됩니다)`,
    });
  }

  if ('status' in data && !isPostStatus(data['status'])) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'status'),
      severity: resolveSeverity('invalid-status', data, options),
      rule: 'invalid-status',
      message: `\`status\`는 ${POST_STATUSES.join(', ')} 중 하나여야 합니다.`,
    });
  }

  return issues;
};

/**
 * 메타 노트 게이트: 유효한 status가 없으면 빌드에서 제외됩니다
 * (repository.ts의 parsePost와 동일 규칙). 이슈를 반환하면 **여기서 검사가
 * 끝나야 한다**는 뜻입니다 — postLike 사슬들은 돌지 않습니다.
 *
 * published가 남아 있는 경우는 statusChain이 이미 에러로 잡았으므로 여기서
 * 조용히 넘어가지 않습니다. status 키가 있으면(값이 깨져 있어도) 게이트를 타지
 * 않습니다 — 빌드에서 제외될 파일이라도 오타 하나 고칠 때마다 새 에러가
 * 튀어나오지 않도록 나머지를 한 번에 전부 알려주기 위한 의도적 동작입니다.
 */
function metaFileGate({ record: { data, relPath }, options }: FileContext) {
  if (isPostFile(data) || 'published' in data || 'status' in data) return null;
  const issue: Issue = {
    file: relPath,
    line: 1,
    severity: resolveSeverity('meta-file-skipped', data, options),
    rule: 'meta-file-skipped',
    message:
      '유효한 `status`가 없어 빌드에서 제외됩니다. 메타 파일이면 무시해도 됩니다.',
  };
  return issue;
}

// ── unknown key 사슬: unknown-frontmatter-key ───────────────────────────────

// 오타(예: `tag` → `tags`, `scheduled` → `scheduledDate`) 조기 감지
const unknownKeyChain: Chain = ({
  record: { data, relPath },
  raw,
  options,
}) => {
  const issues: Issue[] = [];
  for (const key of Object.keys(data)) {
    if (KNOWN_FRONTMATTER_KEYS.has(key)) continue;
    // `published`는 statusChain의 legacy-published-field(에러)가 이미 더 정확한
    // 메시지를 냈습니다. 같은 키에 "알 수 없는 키"까지 겹쳐 내면 사실과도
    // 어긋납니다(모르는 키가 아니라 아는 폐기 키입니다).
    if (key === 'published') continue;
    // 일부러 뺀 키는 "오타인지 확인하라"가 아니라 왜 안 받는지를 말해줍니다.
    const rejection = rejectionReasonFor(key);
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, key),
      severity: resolveSeverity('unknown-frontmatter-key', data, options),
      rule: 'unknown-frontmatter-key',
      message: rejection
        ? `\`${key}\`는 일부러 받지 않는 frontmatter 키입니다 — ${rejection}`
        : `알 수 없는 frontmatter 키: \`${key}\`. 오타가 아닌지 확인하세요. (허용 키: ${FRONTMATTER_KEYS.join(', ')})`,
    });
  }
  return issues;
};

// ── string 필드 사슬: non-string-field ──────────────────────────────────────

// 문자열이어야 하는 키가 다른 타입이면 frontmatterSchema.ts의 toOptionalString이 값을
// 통째로 버리고 폴백합니다(slug는 파일 경로로, excerpt는 본문 앞 160자로,
// thumbnail은 생성 OG 카드로). 특히 `slug: 123` 같은 실수는 **URL이 조용히
// 바뀌는** 결과가 되므로 에러로 막습니다.
const stringFieldChain: Chain = ({
  record: { data, relPath },
  raw,
  options,
}) => {
  const issues: Issue[] = [];
  for (const key of ['slug', 'excerpt', 'thumbnail', 'seoTitle'] as const) {
    if (key in data && typeof data[key] !== 'string') {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, key),
        severity: resolveSeverity('non-string-field', data, options),
        rule: 'non-string-field',
        message: `\`${key}\`는 문자열이어야 합니다. 다른 타입이면 값이 무시되고 기본값으로 폴백합니다${key === 'slug' ? ' (slug는 파일 경로 기반으로 대체되어 URL이 바뀝니다)' : ''}: ${JSON.stringify(data[key])}`,
      });
    }
  }
  return issues;
};

// ── slug 사슬: invalid-slug ─────────────────────────────────────────────────

// 타입만 보던 시절에는 `slug: '/foo'`·`'foo/'`·`'../x'`가 통과했다. 썸네일이 없는
// 글은 og 단계의 스택 트레이스로 처음 드러났고, 있는 글은 아무것도 실패하지 않은
// 채 sitemap에 `/posts//foo/`가 나갔다. 빈 문자열은 로더가 "없음"으로 보고 파일
// 경로 slug로 폴백하므로 여기서 다루지 않는다.
const slugChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const slug = data['slug'];
  if (typeof slug !== 'string' || slug === '') return [];
  const problem = slugProblem(slug);
  if (problem === null) return [];
  return [
    {
      file: relPath,
      line: findFrontmatterLine(raw, 'slug'),
      severity: resolveSeverity('invalid-slug', data, options),
      rule: 'invalid-slug',
      message: `\`slug\`를 URL로 쓸 수 없습니다 — ${problem}: ${JSON.stringify(slug)}`,
    },
  ];
};

// ── title 사슬: missing-title · long-title ──────────────────────────────────

const titleChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const issues: Issue[] = [];

  if (!data['title'] || typeof data['title'] !== 'string') {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'title'),
      severity: resolveSeverity('missing-title', data, options),
      rule: 'missing-title',
      message: '`title` 필드가 필요합니다.',
    });
  }

  // `<title>`은 `{seoTitle ?? title}{seo.titleSuffix}`로 조립됩니다(postSeo.ts).
  // 이 블로그는 `[Typescript로 설계하는 프로젝트]` 같은 긴 시리즈 접두사를 제목에
  // 넣기 때문에 접미사까지 더하면 쉽게 60자를 넘고, 검색 결과에서 뒤가 잘립니다.
  // 제목 자체를 줄이면 글의 정체성이 상하므로 `seoTitle`로 `<title>`만 줄입니다.
  const effectiveTitle =
    typeof data['seoTitle'] === 'string' && data['seoTitle'] !== ''
      ? data['seoTitle']
      : typeof data['title'] === 'string'
        ? data['title']
        : '';
  const { seo } = options;
  const renderedTitleLength = effectiveTitle.length + seo.titleSuffix.length;
  if (effectiveTitle && renderedTitleLength > seo.titleMaxLength) {
    issues.push({
      file: relPath,
      line:
        findFrontmatterLine(raw, 'seoTitle') ??
        findFrontmatterLine(raw, 'title'),
      severity: resolveSeverity('long-title', data, options),
      rule: 'long-title',
      message: `\`<title>\`이 ${renderedTitleLength}자입니다(접미사 \`${seo.titleSuffix}\` 포함, 권장 ${seo.titleMaxLength}자 이하). 검색 결과에서 잘립니다 — \`seoTitle\`에 ${seo.titleMaxLength - seo.titleSuffix.length}자 이하의 짧은 제목을 넣으세요(화면 제목과 OG 카드는 \`title\` 그대로 나갑니다).`,
    });
  }

  return issues;
};

// ── excerpt 사슬: missing-excerpt · truncated-excerpt · excerpt-length ──────

const excerptChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const issues: Issue[] = [];

  // excerpt가 없으면 본문 앞 160자를 잘라 `...`를 붙인 값이 그대로 meta
  // description이 됩니다(repository.ts). 도입부가 비슷한 글끼리는 그 발췌가
  // **글자 단위로 완전히 겹쳐서** 중복 콘텐츠 신호가 되고, 실제로 시리즈의
  // 본편/DI편 같은 짝에서 description이 똑같아진 적이 있습니다.
  //
  // 빈 문자열(`excerpt: ''`)도 같은 취급입니다 — frontmatterSchema.ts의 toOptionalString이
  // 빈 문자열을 "값 없음"으로 떨어뜨려 똑같이 자동 발췌로 폴백하는데, 키가 있다는
  // 이유로 넘어가면 `new-post` 스캐폴딩이 깔아주는 `excerpt: ''`가 영원히 조용합니다.
  if (!('excerpt' in data) || data['excerpt'] === '') {
    issues.push({
      file: relPath,
      line:
        findFrontmatterLine(raw, 'excerpt') ??
        findFrontmatterLine(raw, 'title'),
      severity: resolveSeverity('missing-excerpt', data, options),
      rule: 'missing-excerpt',
      message: `\`excerpt\`가 ${'excerpt' in data ? '비어 있어' : '없어'} 본문 앞 ${options.seo.descriptionMaxLength}자 자동 발췌가 meta description으로 나갑니다. 도입부가 비슷한 글끼리 description이 통째로 겹칠 수 있으니 ${options.seo.descriptionMinLength}~${options.seo.descriptionMaxLength}자의 고유한 요약을 적어주세요.`,
    });
  } else if (typeof data['excerpt'] === 'string') {
    const len = data['excerpt'].length;
    // check-seo는 최종 HTML만 보므로 "말줄임으로 끝나는 description"이 자동 발췌가
    // 샌 것인지 저자가 그렇게 쓴 것인지 구분하지 못하고 배포를 막는다. 여기서 같은
    // 조건을 먼저 잡아, 로컬은 통과하고 CI만 실패하는 상황을 없앤다.
    if (/(\.\.\.|…)$/.test(data['excerpt'].trimEnd())) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'excerpt'),
        severity: resolveSeverity('truncated-excerpt', data, options),
        rule: 'truncated-excerpt',
        message:
          '`excerpt`가 말줄임(`...`/`…`)으로 끝납니다. 자동 발췌가 샌 것과 구분되지 않아 배포 검사(check-seo)가 막습니다 — 문장을 끝맺어 주세요.',
      });
    }
    if (
      len < options.seo.descriptionMinLength ||
      len > options.seo.descriptionMaxLength
    ) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'excerpt'),
        severity: resolveSeverity('excerpt-length', data, options),
        rule: 'excerpt-length',
        message: `\`excerpt\`가 ${len}자입니다(권장 ${options.seo.descriptionMinLength}~${options.seo.descriptionMaxLength}자). 짧으면 검색 스니펫이 비고, 길면 뒤가 잘립니다.`,
      });
    }
  }

  return issues;
};

// ── 날짜 사슬: date · updatedAt · scheduledDate ─────────────────────────────

/**
 * YAML이 Date 객체로 준 값이 **날짜만** 적힌 것이었나.
 *
 * 따옴표 없는 `2026-06-01`은 UTC 자정 Date가 되고, 로더가 되읽어도 적은 날짜와
 * 같은 날이라 무해하다(실제 원고 두 편이 이렇게 쓴다). 따옴표 없는 **시각**은
 * `date`에 시각을 둔 것이라 계약 밖이다 — 파싱 결과로는 둘을 못 가르므로 원문을
 * 본다. 원문 줄을 못 찾으면(흐름 매핑 등) 값이 UTC 자정인지로 판정한다.
 */
function isDateOnlyTimestamp(value: Date, written: string | null): boolean {
  if (written !== null) return /^\d{4}-\d{2}-\d{2}$/.test(written);
  return value.getTime() % 86_400_000 === 0;
}

/** 날짜 필드 하나의 규칙 id와 문구 — 판정 흐름(`checkDateValue`)은 세 필드가 같다. */
interface DateField {
  key: 'date' | 'updatedAt' | 'scheduledDate';
  /** 받는 문자열 형식 — 로더와 같은 `shared/dates.ts`의 판정 */
  accepts: (value: string) => boolean;
  unquoted: RuleId;
  invalid: RuleId;
  ambiguous: RuleId;
  /** 조사까지 붙은 주어(`` `date`가 ``) — Date·비문자열 문구에 쓴다 */
  subject: string;
  /** 규칙별 문구. 뒤에 `: 값`이 붙는다 */
  messages: Record<'unquoted' | 'invalid' | 'ambiguous', string>;
}

const DATE_FIELD: DateField = {
  key: 'date',
  // 계약은 `'YYYY-MM-DD'` 하나다(AGENTS.md 표). 시각은 `scheduledDate`의 몫이다 —
  // 같은 필드에 날짜와 datetime이 섞이면 사전순(시리즈·아카이브)·UTC 자정(목록)·
  // KST 자정(공개 판정) 세 정렬이 서로 다른 순서를 낸다.
  accepts: isIsoDateOnly,
  unquoted: 'unquoted-date',
  invalid: 'invalid-date',
  ambiguous: 'ambiguous-date',
  subject: '`date`가',
  messages: {
    unquoted:
      "`date`에 따옴표 없는 시각이 있습니다 — `date`는 'YYYY-MM-DD' 날짜 하나만 받고(시각은 `scheduledDate`의 몫), 따옴표가 없으면 YAML이 Date 객체로 바꿔 적은 그대로 읽히지도 않습니다. `date: 'YYYY-MM-DD'`로 쓰고 시각은 `scheduledDate: '2026-06-01T09:00:00+09:00'`처럼 따로 적으세요",
    ambiguous:
      "`date`에 timezone offset 없는 시각이 있어 빌드 환경(UTC)과 로컬(KST)에서 날짜가 어긋날 수 있습니다. `date`는 'YYYY-MM-DD'로 쓰고, 시각은 offset을 붙여 `scheduledDate`에 적으세요",
    invalid:
      "`date`는 'YYYY-MM-DD' 형식의 실제 날짜여야 합니다(시각까지 정하려면 `scheduledDate`에 offset과 함께 적으세요)",
  },
};

const UPDATED_AT_FIELD: DateField = {
  key: 'updatedAt',
  // 수정 시각이라 offset을 명시한 datetime도 받는다(Schema.org dateModified).
  accepts: isValidDateString,
  unquoted: 'unquoted-updated-at',
  invalid: 'invalid-updated-at',
  ambiguous: 'ambiguous-updated-at',
  subject: '`updatedAt`이',
  messages: {
    unquoted:
      "`updatedAt`에 따옴표 없는 시각이 있습니다 — YAML이 Date 객체로 바꿔 적은 그대로 읽히지 않습니다(원문의 offset이 사라집니다). 'YYYY-MM-DD'나 따옴표로 감싼 '2026-06-01T09:00:00+09:00'으로 쓰세요",
    ambiguous:
      "`updatedAt`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 날짜가 어긋날 수 있습니다. `+09:00`/`Z`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요",
    invalid:
      "`updatedAt`은 'YYYY-MM-DD'나 offset을 명시한 ISO datetime('2026-06-01T09:00:00+09:00')이어야 합니다",
  },
};

const SCHEDULED_DATE_FIELD: DateField = {
  key: 'scheduledDate',
  // 날짜만 적은 값은 `date`와 같은 뜻이라 중복일 뿐 틀리지는 않다.
  accepts: isValidDateString,
  unquoted: 'unquoted-scheduled-date',
  invalid: 'invalid-scheduled-date',
  ambiguous: 'ambiguous-scheduled-date',
  subject: '`scheduledDate`가',
  messages: {
    // 무따옴표 값은 YAML이 Date 객체로 바꾼다. 날짜만 적은 무따옴표 값은 UTC 자정
    // = KST 오전 9시가 되어, 따옴표를 친 같은 값(KST 자정)과 공개 시각이 갈린다.
    unquoted:
      "`scheduledDate`는 따옴표로 감싼 문자열이어야 합니다. 따옴표가 없으면 YAML이 Date 객체로 바꿔 적은 그대로 읽히지 않고, 날짜만 적은 값은 UTC 자정(KST 오전 9시)이 되어 따옴표를 친 같은 값(KST 자정)과 공개 시각이 9시간 어긋납니다. 예: `scheduledDate: '2026-06-01T09:00:00+09:00'`",
    ambiguous:
      "`scheduledDate`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 발행 시각이 ~9시간 어긋날 수 있습니다. `+09:00` 또는 `Z`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요",
    // 'bad'·공백 구분(`2026-06-01 09:00+09:00`)·달력에 없는 날짜·`+0900`·소문자 `z`.
    invalid:
      "`scheduledDate`는 offset을 명시한 ISO datetime('2026-06-01T09:00:00+09:00')이어야 합니다",
  },
};

/**
 * 날짜 값 하나의 판정 — 받는 형식이면 통과, offset 없는 시각이면 ambiguous, 그 밖은
 * invalid. YAML Date는 원문을 되짚어 따옴표 없는 시각(unquoted)과 달력 밖 날짜
 * (YAML은 `2026-02-30`을 오류 없이 3월 2일로 넘긴다)를 가른다.
 */
function checkDateValue(
  field: DateField,
  value: unknown,
  { record: { data, relPath }, raw, options }: FileContext,
): Issue[] {
  const issue = (rule: RuleId, message: string): Issue[] => [
    {
      file: relPath,
      line: findFrontmatterLine(raw, field.key),
      severity: resolveSeverity(rule, data, options),
      rule,
      message,
    },
  ];
  if (value instanceof Date) {
    const written = frontmatterScalar(raw, field.key);
    if (!isDateOnlyTimestamp(value, written)) {
      return issue(
        field.unquoted,
        `${field.messages.unquoted}: ${written ?? describeValue(value)}`,
      );
    }
    if (written !== null && !isIsoDateOnly(written)) {
      return issue(
        field.invalid,
        `${field.subject} 달력에 없는 날짜입니다(YAML이 다음 달로 넘깁니다): ${written}`,
      );
    }
    return [];
  }
  if (typeof value !== 'string') {
    return issue(
      field.invalid,
      `${field.subject} 유효한 날짜가 아닙니다: ${describeValue(value)}`,
    );
  }
  if (field.accepts(value)) return [];
  // offset 없는 datetime은 parseScheduledDateKST가 실행 환경의 로컬 시각으로
  // 읽는 값이라 CI(UTC)와 로컬(KST)이 갈린다 — 따로 알려 고칠 방향을 준다.
  return hasAmbiguousTimezone(value)
    ? issue(field.ambiguous, `${field.messages.ambiguous}: ${value}`)
    : issue(field.invalid, `${field.messages.invalid}: ${value}`);
}

const dateChain: Chain = ctx => {
  const { data, relPath } = ctx.record;
  // `date`는 선택 필드가 아닙니다. 목록 정렬·아카이브·sitemap·RSS가 모두 읽고,
  // `status: scheduled`는 이 값을 공개 시각으로 씁니다(visibility.ts).
  if (data['date'] == null) {
    return [
      {
        file: relPath,
        line: findFrontmatterLine(ctx.raw, 'date'),
        severity: resolveSeverity('missing-date', data, ctx.options),
        rule: 'missing-date',
        message:
          data['status'] === 'scheduled'
            ? '`date` 필드가 필요합니다. `status: scheduled`는 `date`를 공개 시각으로 쓰므로, 없으면 영원히 비공개 처리됩니다.'
            : '`date` 필드가 필요합니다. 목록 정렬·아카이브·sitemap·RSS가 모두 이 값을 사용합니다.',
      },
    ];
  }
  return checkDateValue(DATE_FIELD, data['date'], ctx);
};

const updatedAtChain: Chain = ctx => {
  const value = ctx.record.data['updatedAt'];
  return value == null ? [] : checkDateValue(UPDATED_AT_FIELD, value, ctx);
};

/**
 * `scheduledDate`는 원문이 곧 공개 시각이라 **따옴표로 감싼 문자열**만 받는다
 * (문자열이 아니면 날짜 모양이어도 unquoted). 형식 검사는 예약 글에서만 한다.
 */
const scheduledDateChain: Chain = ctx => {
  const { data, relPath } = ctx.record;
  if (!('scheduledDate' in data)) return [];
  const value = data['scheduledDate'];
  if (typeof value !== 'string') {
    return [
      {
        file: relPath,
        line: findFrontmatterLine(ctx.raw, 'scheduledDate'),
        severity: resolveSeverity(
          SCHEDULED_DATE_FIELD.unquoted,
          data,
          ctx.options,
        ),
        rule: SCHEDULED_DATE_FIELD.unquoted,
        message: SCHEDULED_DATE_FIELD.messages.unquoted,
      },
    ];
  }
  return data['status'] === 'scheduled'
    ? checkDateValue(SCHEDULED_DATE_FIELD, value, ctx)
    : [];
};

// ── tags 사슬: invalid-tags · duplicate-tags ────────────────────────────────

const tagsChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const issues: Issue[] = [];
  if (!('tags' in data)) return issues;

  // 배열이 아니거나 문자열 아닌 원소가 섞이면 repository.ts가 tags를 통째로
  // undefined로 떨어뜨립니다(조용한 유실). 그래서 원소 타입까지 검사합니다.
  if (!Array.isArray(data['tags'])) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'tags'),
      severity: resolveSeverity('invalid-tags', data, options),
      rule: 'invalid-tags',
      message: '`tags`는 배열이어야 합니다. 예: `tags: [bundler, build]`',
    });
  } else if (data['tags'].some(tag => typeof tag !== 'string')) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'tags'),
      severity: resolveSeverity('invalid-tags', data, options),
      rule: 'invalid-tags',
      message: `\`tags\`의 모든 원소는 문자열이어야 합니다. 문자열이 아닌 값이 하나라도 있으면 태그 전체가 무시됩니다: ${JSON.stringify(data['tags'])}`,
    });
  } else {
    // 렌더 계층(frontmatterSchema의 toStringArray)이 중복을 걷어내므로 화면은 멀쩡하다.
    // 다만 frontmatter에 남아 있으면 저자가 눈치채지 못하므로 경고로 알린다.
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const tag of data['tags'] as string[]) {
      if (seen.has(tag)) dupes.add(tag);
      seen.add(tag);
    }
    if (dupes.size > 0) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'tags'),
        severity: resolveSeverity('duplicate-tags', data, options),
        rule: 'duplicate-tags',
        message: `\`tags\`에 중복이 있습니다(렌더 시 하나로 합쳐집니다): ${[...dupes].join(', ')}`,
      });
    }
  }

  return issues;
};

// ── hero 사슬: unknown-hero-diagram ─────────────────────────────────────────

// `hero`는 코드에 등록된 다이어그램 이름만 받습니다. 미등록 이름은 렌더 계층이
// 조용히 썸네일로 폴백하기 때문에(글이 죽지 않도록 일부러 그렇게 만들었습니다)
// 글쓴이는 "왜 다이어그램이 안 나오지" 상태로 방치됩니다. 그 침묵을 여기서 깹니다.
const heroChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const hero = data['hero'];
  const registered =
    typeof hero === 'string' && options.diagramNames.includes(hero);
  if (!('hero' in data) || registered) return [];
  return [
    {
      file: relPath,
      line: findFrontmatterLine(raw, 'hero'),
      severity: resolveSeverity('unknown-hero-diagram', data, options),
      rule: 'unknown-hero-diagram',
      message: `\`hero\`는 등록된 다이어그램 이름이어야 합니다 (${options.diagramNames.join(', ')}). 새 다이어그램이라면 앱의 content.values.mts(DIAGRAM_NAMES)와 src/components/diagram/registry.ts에 먼저 등록하세요: ${JSON.stringify(hero)}`,
    },
  ];
};

// ── thumbnail 사슬: og-thumbnail-mismatch · invalid-thumbnail-path · missing-thumbnail

/** 생성 OG 카드 경로의 접두사 — 생성기(`render/generate-og-images.ts`)가 쓰는 곳 */
const OG_THUMBNAIL_PREFIX = '/og/';

const thumbnailChain: Chain = ({ record, raw, options }) => {
  const { data, relPath, absPath } = record;
  if (!('thumbnail' in data) || typeof data['thumbnail'] !== 'string')
    return [];
  const thumb = data['thumbnail'];
  // `/og/…`는 "생성 카드를 써라"는 뜻이다. 그런데 생성기는 언제나 `/og/{slug}.png`만
  // 만들고 **나머지 png를 orphan으로 지운다**. 페이지는 frontmatter 경로를 그대로
  // 쓰므로, slug만 고치고(`react-error-deign` → `…-design`) 이 줄을 두면 히어로·목록
  // 카드·og:image가 전부 404인데 다른 검사는 모두 통과한다.
  if (thumb.startsWith(OG_THUMBNAIL_PREFIX)) {
    const slug = resolvePostSlug(data['slug'], relPath);
    const expected = `${OG_THUMBNAIL_PREFIX}${slug}.png`;
    if (decodeUrlSafe(thumb) === expected) return [];
    return [
      {
        file: relPath,
        line: findFrontmatterLine(raw, 'thumbnail'),
        severity: resolveSeverity('og-thumbnail-mismatch', data, options),
        rule: 'og-thumbnail-mismatch',
        message: `\`thumbnail\`이 생성 OG 카드를 가리키지만 이 글의 카드 경로(\`${expected}\`)와 다릅니다 — 생성기는 slug 기준 카드만 만들고 나머지는 지우므로 이미지가 404가 됩니다. \`thumbnail: '${expected}'\`로 고치거나 줄을 지우세요(없어도 같은 카드를 씁니다): ${thumb}`,
      },
    ];
  }
  if (/^https?:\/\//.test(thumb) || thumb.startsWith('/')) return [];
  if (!isBareThumbnailName(thumb)) {
    return [
      {
        file: relPath,
        line: findFrontmatterLine(raw, 'thumbnail'),
        severity: resolveSeverity('invalid-thumbnail-path', data, options),
        rule: 'invalid-thumbnail-path',
        message: `\`thumbnail\`에는 글과 같은 폴더의 **파일 이름**만 적습니다(\`cover.png\`) — \`./\`·\`img/\`·\`../\` 같은 경로가 붙으면 최적화본(\`/thumbs/…\`) URL이 생성 위치와 어긋나 404가 됩니다. 이미지를 글 폴더로 옮기세요: ${thumb}`,
      },
    ];
  }
  const resolved = resolve(dirname(absPath), thumb);
  if (existsSync(resolved)) return [];
  return [
    {
      file: relPath,
      line: findFrontmatterLine(raw, 'thumbnail'),
      severity: resolveSeverity('missing-thumbnail', data, options),
      rule: 'missing-thumbnail',
      message: `썸네일 파일을 찾을 수 없습니다: ${thumb}`,
    },
  ];
};

/**
 * 메타 노트 게이트를 지난 파일(postLike)에 도는 사슬들. **배열 순서 = 리포트
 * 순서**입니다 — 원래 단일 함수 시절의 검사 순서를 그대로 보존합니다.
 */
const POST_LIKE_CHAINS: Chain[] = [
  unknownKeyChain,
  stringFieldChain,
  slugChain,
  titleChain,
  excerptChain,
  dateChain,
  updatedAtChain,
  scheduledDateChain,
  tagsChain,
  heroChain,
  thumbnailChain,
];

export function validatePost(
  record: PostRecord,
  raw: string,
  options: ValidateContext,
): Issue[] {
  const ctx: FileContext = { record, raw, options };
  const issues = statusChain(ctx);

  const gate = metaFileGate(ctx);
  if (gate) {
    issues.push(gate);
    return issues;
  }

  for (const chain of POST_LIKE_CHAINS) {
    issues.push(...chain(ctx));
  }
  return issues;
}
