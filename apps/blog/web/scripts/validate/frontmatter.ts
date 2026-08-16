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
} from '@/domain/post';
// 이름 목록만 있는 모듈에서 가져옵니다. registry.ts(=.tsx 컴포넌트 의존)를 직접
// 참조하면 이 노드 스크립트가 React·Panda까지 끌고 들어옵니다.
import { DIAGRAM_NAMES, isDiagramName } from '@/domain/post/diagramNames';
import { hasAmbiguousTimezone } from '@/lib/dates';
import {
  TITLE_SUFFIX,
  SEO_TITLE_MAX_LENGTH,
  SEO_DESCRIPTION_MIN_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
} from '@/lib/constants';
import { findFrontmatterLine } from './shared';
import type { Issue, PostRecord, ValidateOptions } from './shared';
import { resolveSeverity } from './rules';

/**
 * 허용 키의 단일 출처는 **서술자 테이블**(domain/post/frontmatterSchema.ts)입니다.
 * 예전에는 여기 손으로 쓴 Set이 따로 있어 `RawFrontmatter`와 어긋날 수 있었습니다
 * (실제로 순서가 달랐고, 어긋나도 아무것도 깨지지 않았습니다).
 *
 * 의도적으로 뺀 키(`published` · `description` · `draft` · `category` · `series` ·
 * `order`)와 각각의 거부 사유도 같은 파일의 `REJECTED_FRONTMATTER_KEYS`에
 * 데이터로 있습니다 — 사유가 주석이 아니라 값이라서 그대로 lint 메시지에 실립니다.
 */
const KNOWN_FRONTMATTER_KEYS = new Set<string>(FRONTMATTER_KEYS);

/** 판정 사슬 하나가 받는 것 전부. 심각도 계산에 data와 options가 함께 필요하다. */
interface FileContext {
  record: PostRecord;
  raw: string;
  options: ValidateOptions;
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

  if ('status' in data && !isPostStatus(data.status)) {
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

// ── title 사슬: missing-title · long-title ──────────────────────────────────

const titleChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const issues: Issue[] = [];

  if (!data.title || typeof data.title !== 'string') {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'title'),
      severity: resolveSeverity('missing-title', data, options),
      rule: 'missing-title',
      message: '`title` 필드가 필요합니다.',
    });
  }

  // `<title>`은 `{seoTitle ?? title}{TITLE_SUFFIX}`로 조립됩니다(postSeo.ts).
  // 이 블로그는 `[Typescript로 설계하는 프로젝트]` 같은 긴 시리즈 접두사를 제목에
  // 넣기 때문에 접미사까지 더하면 쉽게 60자를 넘고, 검색 결과에서 뒤가 잘립니다.
  // 제목 자체를 줄이면 글의 정체성이 상하므로 `seoTitle`로 `<title>`만 줄입니다.
  const effectiveTitle =
    typeof data.seoTitle === 'string' && data.seoTitle !== ''
      ? data.seoTitle
      : typeof data.title === 'string'
        ? data.title
        : '';
  const renderedTitleLength = effectiveTitle.length + TITLE_SUFFIX.length;
  if (effectiveTitle && renderedTitleLength > SEO_TITLE_MAX_LENGTH) {
    issues.push({
      file: relPath,
      line:
        findFrontmatterLine(raw, 'seoTitle') ??
        findFrontmatterLine(raw, 'title'),
      severity: resolveSeverity('long-title', data, options),
      rule: 'long-title',
      message: `\`<title>\`이 ${renderedTitleLength}자입니다(접미사 \`${TITLE_SUFFIX}\` 포함, 권장 ${SEO_TITLE_MAX_LENGTH}자 이하). 검색 결과에서 잘립니다 — \`seoTitle\`에 ${SEO_TITLE_MAX_LENGTH - TITLE_SUFFIX.length}자 이하의 짧은 제목을 넣으세요(화면 제목과 OG 카드는 \`title\` 그대로 나갑니다).`,
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
  if (!('excerpt' in data) || data.excerpt === '') {
    issues.push({
      file: relPath,
      line:
        findFrontmatterLine(raw, 'excerpt') ??
        findFrontmatterLine(raw, 'title'),
      severity: resolveSeverity('missing-excerpt', data, options),
      rule: 'missing-excerpt',
      message: `\`excerpt\`가 ${'excerpt' in data ? '비어 있어' : '없어'} 본문 앞 ${SEO_DESCRIPTION_MAX_LENGTH}자 자동 발췌가 meta description으로 나갑니다. 도입부가 비슷한 글끼리 description이 통째로 겹칠 수 있으니 ${SEO_DESCRIPTION_MIN_LENGTH}~${SEO_DESCRIPTION_MAX_LENGTH}자의 고유한 요약을 적어주세요.`,
    });
  } else if (typeof data.excerpt === 'string') {
    const len = data.excerpt.length;
    // check-seo는 최종 HTML만 보므로 "말줄임으로 끝나는 description"이 자동 발췌가
    // 샌 것인지 저자가 그렇게 쓴 것인지 구분하지 못하고 배포를 막는다. 여기서 같은
    // 조건을 먼저 잡아, 로컬은 통과하고 CI만 실패하는 상황을 없앤다.
    if (/(\.\.\.|…)$/.test(data.excerpt.trimEnd())) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'excerpt'),
        severity: resolveSeverity('truncated-excerpt', data, options),
        rule: 'truncated-excerpt',
        message:
          '`excerpt`가 말줄임(`...`/`…`)으로 끝납니다. 자동 발췌가 샌 것과 구분되지 않아 배포 검사(check-seo)가 막습니다 — 문장을 끝맺어 주세요.',
      });
    }
    if (len < SEO_DESCRIPTION_MIN_LENGTH || len > SEO_DESCRIPTION_MAX_LENGTH) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'excerpt'),
        severity: resolveSeverity('excerpt-length', data, options),
        rule: 'excerpt-length',
        message: `\`excerpt\`가 ${len}자입니다(권장 ${SEO_DESCRIPTION_MIN_LENGTH}~${SEO_DESCRIPTION_MAX_LENGTH}자). 짧으면 검색 스니펫이 비고, 길면 뒤가 잘립니다.`,
      });
    }
  }

  return issues;
};

// ── date 사슬: missing-date · invalid-date · ambiguous-date ─────────────────

const dateChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const issues: Issue[] = [];

  // `date`는 선택 필드가 아닙니다. 목록 정렬(filtering.ts), 아카이브 연도 필터,
  // sitemap lastmod, RSS pubDate가 모두 이 값을 읽고, `status: scheduled`는 이 값을
  // 공개 시각으로 씁니다(visibility.ts). 없으면 목록에서 날짜가 비고 예약 글은
  // 영원히 비공개가 되는데, 지금까지는 아무 경고 없이 통과했습니다.
  if (data.date == null) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'date'),
      severity: resolveSeverity('missing-date', data, options),
      rule: 'missing-date',
      message:
        data.status === 'scheduled'
          ? '`date` 필드가 필요합니다. `status: scheduled`는 `date`를 공개 시각으로 쓰므로, 없으면 영원히 비공개 처리됩니다.'
          : '`date` 필드가 필요합니다. 목록 정렬·아카이브·sitemap·RSS가 모두 이 값을 사용합니다.',
    });
    return issues;
  }

  const dateValid =
    data.date instanceof Date ||
    (typeof data.date === 'string' && !Number.isNaN(Date.parse(data.date)));
  if (!dateValid) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'date'),
      severity: resolveSeverity('invalid-date', data, options),
      rule: 'invalid-date',
      message: `\`date\`가 유효한 날짜가 아닙니다: ${String(data.date)}`,
    });
  } else if (typeof data.date === 'string' && hasAmbiguousTimezone(data.date)) {
    // date도 sitemap lastmod / rss pubDate에서 parseScheduledDateKST를 거치므로
    // offset 없는 datetime이면 scheduledDate와 동일하게 환경 의존 회귀가 생긴다.
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'date'),
      severity: resolveSeverity('ambiguous-date', data, options),
      rule: 'ambiguous-date',
      message: `\`date\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 날짜가 어긋날 수 있습니다. \`+09:00\`/\`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.date}`,
    });
  }

  return issues;
};

// ── updatedAt 사슬: invalid-updated-at · ambiguous-updated-at ───────────────

const updatedAtChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const issues: Issue[] = [];
  if (data.updatedAt == null) return issues;

  const updatedAtValid =
    data.updatedAt instanceof Date ||
    (typeof data.updatedAt === 'string' &&
      !Number.isNaN(Date.parse(data.updatedAt)));
  if (!updatedAtValid) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'updatedAt'),
      severity: resolveSeverity('invalid-updated-at', data, options),
      rule: 'invalid-updated-at',
      message: `\`updatedAt\`이 유효한 날짜가 아닙니다: ${String(data.updatedAt)}`,
    });
  } else if (
    typeof data.updatedAt === 'string' &&
    hasAmbiguousTimezone(data.updatedAt)
  ) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'updatedAt'),
      severity: resolveSeverity('ambiguous-updated-at', data, options),
      rule: 'ambiguous-updated-at',
      message: `\`updatedAt\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 날짜가 어긋날 수 있습니다. \`+09:00\`/\`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.updatedAt}`,
    });
  }
  return issues;
};

// ── scheduledDate 사슬: unquoted- · invalid- · ambiguous-scheduled-date ─────

const scheduledDateChain: Chain = ({
  record: { data, relPath },
  raw,
  options,
}) => {
  const issues: Issue[] = [];

  // scheduledDate는 반드시 따옴표로 감싼 문자열이어야 합니다.
  // 무따옴표 datetime(`scheduledDate: 2026-06-01T09:00:00+09:00`)은 YAML이 Date
  // 객체로 파싱하고, repository.ts가 문자열이 아닌 값을 버립니다. 그러면 공개 시각이
  // date로 폴백되는데 date는 KST 자정 기준이라 **의도보다 9시간 일찍 공개**됩니다.
  if ('scheduledDate' in data && typeof data.scheduledDate !== 'string') {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'scheduledDate'),
      severity: resolveSeverity('unquoted-scheduled-date', data, options),
      rule: 'unquoted-scheduled-date',
      message: `\`scheduledDate\`는 따옴표로 감싼 문자열이어야 합니다. 무따옴표로 쓰면 YAML이 Date 객체로 파싱해 값이 버려지고, 공개 시각이 \`date\`(KST 자정)로 폴백되어 의도보다 9시간 일찍 공개됩니다. 예: \`scheduledDate: '2026-06-01T09:00:00+09:00'\``,
    });
  }

  if (data.status === 'scheduled') {
    // 공개 시각이 아예 없는 경우는 date 사슬의 missing-date가 잡습니다. 예전에는
    // 여기서 scheduled-without-date로 따로 검사했지만, date가 필수가 되면서 그 조건
    // (`scheduledDate도 date도 없음`)은 missing-date에 완전히 포섭돼 같은 파일에
    // 에러 두 개가 뜰 뿐이었습니다.
    if (
      typeof data.scheduledDate === 'string' &&
      Number.isNaN(Date.parse(data.scheduledDate))
    ) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'scheduledDate'),
        severity: resolveSeverity('invalid-scheduled-date', data, options),
        rule: 'invalid-scheduled-date',
        message: `\`scheduledDate\`가 유효한 날짜가 아닙니다: ${data.scheduledDate}`,
      });
    } else if (
      typeof data.scheduledDate === 'string' &&
      hasAmbiguousTimezone(data.scheduledDate)
    ) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'scheduledDate'),
        severity: resolveSeverity('ambiguous-scheduled-date', data, options),
        rule: 'ambiguous-scheduled-date',
        message: `\`scheduledDate\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 발행 시각이 ~9시간 어긋날 수 있습니다. \`+09:00\` 또는 \`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.scheduledDate}`,
      });
    }
  }

  return issues;
};

// ── tags 사슬: invalid-tags · duplicate-tags ────────────────────────────────

const tagsChain: Chain = ({ record: { data, relPath }, raw, options }) => {
  const issues: Issue[] = [];
  if (!('tags' in data)) return issues;

  // 배열이 아니거나 문자열 아닌 원소가 섞이면 repository.ts가 tags를 통째로
  // undefined로 떨어뜨립니다(조용한 유실). 그래서 원소 타입까지 검사합니다.
  if (!Array.isArray(data.tags)) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'tags'),
      severity: resolveSeverity('invalid-tags', data, options),
      rule: 'invalid-tags',
      message: '`tags`는 배열이어야 합니다. 예: `tags: [bundler, build]`',
    });
  } else if (data.tags.some(tag => typeof tag !== 'string')) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'tags'),
      severity: resolveSeverity('invalid-tags', data, options),
      rule: 'invalid-tags',
      message: `\`tags\`의 모든 원소는 문자열이어야 합니다. 문자열이 아닌 값이 하나라도 있으면 태그 전체가 무시됩니다: ${JSON.stringify(data.tags)}`,
    });
  } else {
    // 렌더 계층(frontmatterSchema의 toStringArray)이 중복을 걷어내므로 화면은 멀쩡하다.
    // 다만 frontmatter에 남아 있으면 저자가 눈치채지 못하므로 경고로 알린다.
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const tag of data.tags as string[]) {
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
  if (!('hero' in data) || isDiagramName(data.hero)) return [];
  return [
    {
      file: relPath,
      line: findFrontmatterLine(raw, 'hero'),
      severity: resolveSeverity('unknown-hero-diagram', data, options),
      rule: 'unknown-hero-diagram',
      message: `\`hero\`는 등록된 다이어그램 이름이어야 합니다 (${DIAGRAM_NAMES.join(', ')}). 새 다이어그램이라면 domain/post/diagramNames.ts와 src/components/diagram/registry.ts에 먼저 등록하세요: ${JSON.stringify(data.hero)}`,
    },
  ];
};

// ── thumbnail 사슬: missing-thumbnail ───────────────────────────────────────

const thumbnailChain: Chain = ({ record, raw, options }) => {
  const { data, relPath, absPath } = record;
  if (!('thumbnail' in data) || typeof data.thumbnail !== 'string') return [];
  const thumb = data.thumbnail;
  if (/^https?:\/\//.test(thumb) || thumb.startsWith('/')) return [];
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
  options: ValidateOptions = {},
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
