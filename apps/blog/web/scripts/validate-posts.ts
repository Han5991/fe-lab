import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve, dirname, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { collectMarkdownFiles, hasFrontmatter } from '@/lib/postFiles';
import { hasAmbiguousTimezone } from '@/lib/dates';
import {
  TITLE_SUFFIX,
  SEO_TITLE_MAX_LENGTH,
  SEO_DESCRIPTION_MIN_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
} from '@/lib/constants';
import {
  POST_STATUSES,
  isPostStatus,
  isPostFile,
  isPostVisible,
  resolveExcerpt,
  toDateString,
} from '@/domain/post';
// 이름 목록만 있는 모듈에서 가져옵니다. registry.ts(=.tsx 컴포넌트 의존)를 직접
// 참조하면 이 노드 스크립트가 React·Panda까지 끌고 들어옵니다.
import { DIAGRAM_NAMES, isDiagramName } from '@/domain/post/diagramNames';
import { SUPPORTED_FENCE_LABELS } from '@/src/components/post/prismLanguages';

const POSTS_DIR = resolve(process.cwd(), '..', 'posts');

/**
 * repository.ts / types.ts / visibility.ts 에서 **실제로 읽는** 키 전체.
 * 여기에 없는 키가 frontmatter에 있으면 unknown-frontmatter-key 경고를 냅니다.
 *
 * 의도적으로 뺀 키:
 * - `published` — status로 통합됨. 아래 legacy-published-field 규칙이 에러로 잡습니다.
 * - `description` — excerpt와 역할이 겹치는데 어떤 코드도 읽지 않았습니다.
 * - `draft`, `category` — 읽는 코드가 없는 유령 키.
 * - `series` — 시리즈는 폴더 경로로 결정됩니다(repository.ts). frontmatter 값은 무시됩니다.
 * - `order` — `_series.yml` 전용인데 collectMarkdownFiles가 `.yml`을 수집하지 않아
 *             애초에 이 검사에 들어오지 않습니다.
 */
const KNOWN_FRONTMATTER_KEYS = new Set([
  'title',
  'seoTitle',
  'date',
  'updatedAt',
  'slug',
  'excerpt',
  'thumbnail',
  'tags',
  'status',
  'scheduledDate',
  'hero',
]);

type Severity = 'error' | 'warning';

export interface Issue {
  file: string;
  line: number | null;
  severity: Severity;
  rule: string;
  message: string;
}

export interface PostRecord {
  absPath: string;
  relPath: string;
  data: Record<string, unknown>;
  content: string;
}

function findFrontmatterLine(raw: string, key: string): number | null {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return null;
    const m = lines[i].match(/^(\w+)\s*:/);
    if (m && m[1] === key) return i + 1;
  }
  return null;
}

export interface ValidateOptions {
  /**
   * SEO 계약 위반을 에러로 취급할지. **prebuild에서만** 켭니다.
   *
   * `check-seo`(빌드 산출물 검사)는 발행되는 페이지를 보고, 위반하면 배포를
   * 막습니다. 그 원인이 되는 원문 문제가 항상 경고에 그치면 `draft`를
   * `published`로 바꾸는 순간 로컬 검사와 빌드는 통과하고 **CI에서만** 터집니다.
   * 그래서 빌드 직전에는 같은 조건을 에러로 올려, 15초짜리 빌드를 돌리기 전에
   * 파일·줄 번호와 함께 먼저 잡습니다.
   *
   * 반대로 `predev`(dev 서버)와 `pnpm lint:posts`에서는 켜지 않습니다 — 글을
   * 쓰는 중에 `status: published`로 두는 건 흔한데, 요약을 아직 안 적었다고
   * dev 서버가 안 뜨면 도구가 방해물이 됩니다.
   */
  strict?: boolean;
}

/**
 * SEO 계약 위반의 심각도.
 *
 * **규칙: strict 에러의 범위는 `check-seo`가 보는 범위와 정확히 같다.**
 * 즉 지금 빌드 산출물에 실리는 글(`isPostVisible`)만 에러다.
 *
 * strict 모드의 목적은 "로컬은 통과, CI만 실패"를 없애는 것이다. 그러니 로컬이
 * CI보다 **더** 엄격해도 안 된다 — 그건 다른 종류의 실패다. 아직 공개 전인 예약
 * 글까지 에러로 잡으면, 그 글과 아무 상관 없는 이미 발행된 변경까지 배포가
 * 통째로 막힌다(그 글은 `out/`에 들어가지도 않아 check-seo는 볼 수조차 없다).
 * `pnpm new-post --scheduled …`가 깔아주는 빈 excerpt 때문에 스캐폴딩 직후
 * 빌드가 실패하는 것도 같은 원인이다.
 *
 * 예약 글이 공개일에 문제를 드러내면 그때 cron 빌드가 실패한다. 그건 워크플로
 * 실패 알림으로 드러나고, 무엇보다 **문제가 실제로 들어 있는 빌드**만 막는다.
 * 그 전까지는 경고로 계속 보이므로 눈에 안 띄는 것도 아니다.
 *
 * `draft`는 영영 나갈 일이 없으므로 당연히 경고다.
 *
 * 본문 h1(`body-h1`)은 여기 해당하지 않는다 — 렌더 계층이 h2로 강등해
 * check-seo의 h1 검사를 통과하므로 원문이 그대로여도 배포가 막히지 않는다.
 */
/**
 * frontmatter 원문으로 "지금 공개되는 글인가"를 판정합니다.
 *
 * `isPostVisible`은 날짜가 **문자열**일 때만 공개 시각으로 인정합니다(도메인은
 * 정규화된 PostData를 받는 전제). 그런데 여기서 보는 건 gray-matter 원문이라,
 * 따옴표 없이 쓴 `date: 2026-08-10`은 YAML이 **Date 객체**로 파싱합니다 —
 * `new-post`가 정확히 그렇게 씁니다. 그대로 넘기면 이미 공개된 예약 글이
 * "비공개"로 판정되어 strict 에러가 조용히 경고로 떨어집니다.
 * repository가 PostData를 만들 때 쓰는 `toDateString`을 똑같이 거칩니다.
 */
function isVisibleFrontmatter(data: Record<string, unknown>): boolean {
  return isPostVisible({
    status: data.status,
    date: toDateString(data.date),
    scheduledDate: toDateString(data.scheduledDate),
  } as Parameters<typeof isPostVisible>[0]);
}

function seoSeverity(
  data: Record<string, unknown>,
  { strict }: ValidateOptions,
): Severity {
  if (!strict || !isPostFile(data)) return 'warning';
  return isVisibleFrontmatter(data) ? 'error' : 'warning';
}

export function validatePost(
  record: PostRecord,
  raw: string,
  options: ValidateOptions = {},
): Issue[] {
  const { data, relPath, absPath } = record;
  const issues: Issue[] = [];

  // 폐기된 published 필드 — status로 통합됨. status와 공존하면 조용히 무시되므로 에러.
  if ('published' in data) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'published'),
      severity: 'error',
      rule: 'legacy-published-field',
      message: `\`published\`는 더 이상 쓰지 않습니다. \`status: ${POST_STATUSES.join(' | ')}\`로 바꾸세요. (\`status\`가 함께 있으면 \`published\`는 조용히 무시됩니다)`,
    });
  }

  if ('status' in data && !isPostStatus(data.status)) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'status'),
      severity: 'error',
      rule: 'invalid-status',
      message: `\`status\`는 ${POST_STATUSES.join(', ')} 중 하나여야 합니다.`,
    });
  }

  // 유효한 status가 없으면 빌드에서 제외됩니다 (repository.ts의 parsePost와 동일 규칙).
  // published가 남아 있는 경우는 위에서 이미 에러로 잡았으므로 여기서 조용히 넘어가지 않습니다.
  if (!isPostFile(data) && !('published' in data) && !('status' in data)) {
    issues.push({
      file: relPath,
      line: 1,
      severity: 'warning',
      rule: 'meta-file-skipped',
      message:
        '유효한 `status`가 없어 빌드에서 제외됩니다. 메타 파일이면 무시해도 됩니다.',
    });
    return issues;
  }

  // unknown frontmatter key 경고 — 오타(예: `tag` → `tags`, `scheduled` → `scheduledDate`) 조기 감지
  for (const key of Object.keys(data)) {
    if (!KNOWN_FRONTMATTER_KEYS.has(key)) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, key),
        severity: 'warning',
        rule: 'unknown-frontmatter-key',
        message: `알 수 없는 frontmatter 키: \`${key}\`. 오타가 아닌지 확인하세요. (허용 키: ${[...KNOWN_FRONTMATTER_KEYS].join(', ')})`,
      });
    }
  }

  // 문자열이어야 하는 키가 다른 타입이면 repository.ts의 toOptionalString이 값을
  // 통째로 버리고 폴백합니다(slug는 파일 경로로, excerpt는 본문 앞 160자로,
  // thumbnail은 생성 OG 카드로). 특히 `slug: 123` 같은 실수는 **URL이 조용히
  // 바뀌는** 결과가 되므로 에러로 막습니다.
  for (const key of ['slug', 'excerpt', 'thumbnail', 'seoTitle'] as const) {
    if (key in data && typeof data[key] !== 'string') {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, key),
        severity: 'error',
        rule: 'non-string-field',
        message: `\`${key}\`는 문자열이어야 합니다. 다른 타입이면 값이 무시되고 기본값으로 폴백합니다${key === 'slug' ? ' (slug는 파일 경로 기반으로 대체되어 URL이 바뀝니다)' : ''}: ${JSON.stringify(data[key])}`,
      });
    }
  }

  if (!data.title || typeof data.title !== 'string') {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'title'),
      severity: 'error',
      rule: 'missing-title',
      message: '`title` 필드가 필요합니다.',
    });
  }

  const publishSeverity = seoSeverity(data, options);

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
      severity: publishSeverity,
      rule: 'long-title',
      message: `\`<title>\`이 ${renderedTitleLength}자입니다(접미사 \`${TITLE_SUFFIX}\` 포함, 권장 ${SEO_TITLE_MAX_LENGTH}자 이하). 검색 결과에서 잘립니다 — \`seoTitle\`에 ${SEO_TITLE_MAX_LENGTH - TITLE_SUFFIX.length}자 이하의 짧은 제목을 넣으세요(화면 제목과 OG 카드는 \`title\` 그대로 나갑니다).`,
    });
  }

  // excerpt가 없으면 본문 앞 160자를 잘라 `...`를 붙인 값이 그대로 meta
  // description이 됩니다(repository.ts). 도입부가 비슷한 글끼리는 그 발췌가
  // **글자 단위로 완전히 겹쳐서** 중복 콘텐츠 신호가 되고, 실제로 시리즈의
  // 본편/DI편 같은 짝에서 description이 똑같아진 적이 있습니다.
  //
  // 빈 문자열(`excerpt: ''`)도 같은 취급입니다 — repository.ts의 toOptionalString이
  // 빈 문자열을 "값 없음"으로 떨어뜨려 똑같이 자동 발췌로 폴백하는데, 키가 있다는
  // 이유로 넘어가면 `new-post` 스캐폴딩이 깔아주는 `excerpt: ''`가 영원히 조용합니다.
  if (!('excerpt' in data) || data.excerpt === '') {
    issues.push({
      file: relPath,
      line:
        findFrontmatterLine(raw, 'excerpt') ??
        findFrontmatterLine(raw, 'title'),
      severity: publishSeverity,
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
        severity: publishSeverity,
        rule: 'truncated-excerpt',
        message:
          '`excerpt`가 말줄임(`...`/`…`)으로 끝납니다. 자동 발췌가 샌 것과 구분되지 않아 배포 검사(check-seo)가 막습니다 — 문장을 끝맺어 주세요.',
      });
    }
    if (len < SEO_DESCRIPTION_MIN_LENGTH || len > SEO_DESCRIPTION_MAX_LENGTH) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'excerpt'),
        severity: publishSeverity,
        rule: 'excerpt-length',
        message: `\`excerpt\`가 ${len}자입니다(권장 ${SEO_DESCRIPTION_MIN_LENGTH}~${SEO_DESCRIPTION_MAX_LENGTH}자). 짧으면 검색 스니펫이 비고, 길면 뒤가 잘립니다.`,
      });
    }
  }

  // `date`는 선택 필드가 아닙니다. 목록 정렬(filtering.ts), 아카이브 연도 필터,
  // sitemap lastmod, RSS pubDate가 모두 이 값을 읽고, `status: scheduled`는 이 값을
  // 공개 시각으로 씁니다(visibility.ts). 없으면 목록에서 날짜가 비고 예약 글은
  // 영원히 비공개가 되는데, 지금까지는 아무 경고 없이 통과했습니다.
  if (data.date == null) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'date'),
      severity: 'error',
      rule: 'missing-date',
      message:
        data.status === 'scheduled'
          ? '`date` 필드가 필요합니다. `status: scheduled`는 `date`를 공개 시각으로 쓰므로, 없으면 영원히 비공개 처리됩니다.'
          : '`date` 필드가 필요합니다. 목록 정렬·아카이브·sitemap·RSS가 모두 이 값을 사용합니다.',
    });
  } else {
    const dateValid =
      data.date instanceof Date ||
      (typeof data.date === 'string' && !Number.isNaN(Date.parse(data.date)));
    if (!dateValid) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'date'),
        severity: 'error',
        rule: 'invalid-date',
        message: `\`date\`가 유효한 날짜가 아닙니다: ${String(data.date)}`,
      });
    } else if (
      typeof data.date === 'string' &&
      hasAmbiguousTimezone(data.date)
    ) {
      // date도 sitemap lastmod / rss pubDate에서 parseScheduledDateKST를 거치므로
      // offset 없는 datetime이면 scheduledDate와 동일하게 환경 의존 회귀가 생긴다.
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'date'),
        severity: 'error',
        rule: 'ambiguous-date',
        message: `\`date\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 날짜가 어긋날 수 있습니다. \`+09:00\`/\`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.date}`,
      });
    }
  }

  if (data.updatedAt != null) {
    const updatedAtValid =
      data.updatedAt instanceof Date ||
      (typeof data.updatedAt === 'string' &&
        !Number.isNaN(Date.parse(data.updatedAt)));
    if (!updatedAtValid) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'updatedAt'),
        severity: 'error',
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
        severity: 'error',
        rule: 'ambiguous-updated-at',
        message: `\`updatedAt\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 날짜가 어긋날 수 있습니다. \`+09:00\`/\`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.updatedAt}`,
      });
    }
  }

  // scheduledDate는 반드시 따옴표로 감싼 문자열이어야 합니다.
  // 무따옴표 datetime(`scheduledDate: 2026-06-01T09:00:00+09:00`)은 YAML이 Date
  // 객체로 파싱하고, repository.ts가 문자열이 아닌 값을 버립니다. 그러면 공개 시각이
  // date로 폴백되는데 date는 KST 자정 기준이라 **의도보다 9시간 일찍 공개**됩니다.
  if ('scheduledDate' in data && typeof data.scheduledDate !== 'string') {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'scheduledDate'),
      severity: 'error',
      rule: 'unquoted-scheduled-date',
      message: `\`scheduledDate\`는 따옴표로 감싼 문자열이어야 합니다. 무따옴표로 쓰면 YAML이 Date 객체로 파싱해 값이 버려지고, 공개 시각이 \`date\`(KST 자정)로 폴백되어 의도보다 9시간 일찍 공개됩니다. 예: \`scheduledDate: '2026-06-01T09:00:00+09:00'\``,
    });
  }

  if (data.status === 'scheduled') {
    // 공개 시각이 아예 없는 경우는 위의 missing-date가 잡습니다. 예전에는 여기서
    // scheduled-without-date로 따로 검사했지만, date가 필수가 되면서 그 조건
    // (`scheduledDate도 date도 없음`)은 missing-date에 완전히 포섭돼 같은 파일에
    // 에러 두 개가 뜰 뿐이었습니다.
    if (
      typeof data.scheduledDate === 'string' &&
      Number.isNaN(Date.parse(data.scheduledDate))
    ) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'scheduledDate'),
        severity: 'error',
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
        severity: 'error',
        rule: 'ambiguous-scheduled-date',
        message: `\`scheduledDate\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 발행 시각이 ~9시간 어긋날 수 있습니다. \`+09:00\` 또는 \`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.scheduledDate}`,
      });
    }
  }

  if ('tags' in data) {
    // 배열이 아니거나 문자열 아닌 원소가 섞이면 repository.ts가 tags를 통째로
    // undefined로 떨어뜨립니다(조용한 유실). 그래서 원소 타입까지 검사합니다.
    if (!Array.isArray(data.tags)) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'tags'),
        severity: 'error',
        rule: 'invalid-tags',
        message: '`tags`는 배열이어야 합니다. 예: `tags: [bundler, build]`',
      });
    } else if (data.tags.some(tag => typeof tag !== 'string')) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'tags'),
        severity: 'error',
        rule: 'invalid-tags',
        message: `\`tags\`의 모든 원소는 문자열이어야 합니다. 문자열이 아닌 값이 하나라도 있으면 태그 전체가 무시됩니다: ${JSON.stringify(data.tags)}`,
      });
    } else {
      // 렌더 계층(repository.toStringArray)이 중복을 걷어내므로 화면은 멀쩡하다.
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
          severity: 'warning',
          rule: 'duplicate-tags',
          message: `\`tags\`에 중복이 있습니다(렌더 시 하나로 합쳐집니다): ${[...dupes].join(', ')}`,
        });
      }
    }
  }

  // `hero`는 코드에 등록된 다이어그램 이름만 받습니다. 미등록 이름은 렌더 계층이
  // 조용히 썸네일로 폴백하기 때문에(글이 죽지 않도록 일부러 그렇게 만들었습니다)
  // 글쓴이는 "왜 다이어그램이 안 나오지" 상태로 방치됩니다. 그 침묵을 여기서 깹니다.
  if ('hero' in data && !isDiagramName(data.hero)) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'hero'),
      severity: 'error',
      rule: 'unknown-hero-diagram',
      message: `\`hero\`는 등록된 다이어그램 이름이어야 합니다 (${DIAGRAM_NAMES.join(', ')}). 새 다이어그램이라면 domain/post/diagramNames.ts와 src/components/diagram/registry.ts에 먼저 등록하세요: ${JSON.stringify(data.hero)}`,
    });
  }

  if ('thumbnail' in data && typeof data.thumbnail === 'string') {
    const thumb = data.thumbnail;
    if (!/^https?:\/\//.test(thumb) && !thumb.startsWith('/')) {
      const resolved = resolve(dirname(absPath), thumb);
      if (!existsSync(resolved)) {
        issues.push({
          file: relPath,
          line: findFrontmatterLine(raw, 'thumbnail'),
          severity: 'error',
          rule: 'missing-thumbnail',
          message: `썸네일 파일을 찾을 수 없습니다: ${thumb}`,
        });
      }
    }
  }

  return issues;
}

function frontmatterOffset(raw: string): number {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return i + 1;
  }
  return 0;
}

/**
 * 퍼센트 인코딩을 풀되, 잘못된 시퀀스(`./100%.png`의 `%.`처럼)에는 원문을 씁니다.
 *
 * 맨 decodeURIComponent는 URIError를 던져 **검증기 전체가 스택 트레이스만 남기고
 * 죽습니다** — 위반 하나를 보고해야 할 자리에서 도구가 멈추는 셈입니다.
 * (check-seo도 같은 이유로 감싸고 있습니다)
 */
function decodeUrlSafe(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

/** 마크다운 `![alt](src)` — alt는 비어 있을 수 있다. */
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** 개행은 남기고 나머지만 공백으로 — 줄 번호 계산이 어긋나지 않도록. */
function blank(text: string): string {
  return text.replace(/[^\n]/g, ' ');
}

/**
 * 코드 펜스 안을 **길이를 유지한 채** 공백으로 덮은 본문을 만듭니다.
 *
 * 펜스 안의 이미지 문법이나 `# 주석`은 코드 **예시**입니다 — 실제로 이 저장소의
 * 글에 펜스 안 `# ` 줄이 32개 있습니다(쉘·yaml 주석).
 *
 * **덮는 곳은 펜스뿐입니다.** 인라인 코드와 HTML 주석도 덮어 봤지만, 둘 다
 * 여는 표시와 닫는 표시를 문서에서 짝지어야 해서 짝이 하나만 어긋나면 멀쩡한
 * 산문을 통째로 덮었고, 그 안의 깨진 이미지와 진짜 h1이 **조용히 사라졌습니다**.
 * 검사기가 스스로 검사를 끄는 실패라, 오탐보다 나쁩니다.
 * 코퍼스로도 확인했습니다 — 인라인 코드로 `<img>`·`<h1>`을 인용한 글은 0건인데
 * `<!--`와 `-->`가 산문에서 짝이 안 맞는 글은 3건입니다. 막으려던 문제보다
 * 부작용이 흔합니다. 펜스는 여닫이가 줄 단위로 명확해 같은 함정이 없습니다.
 *
 * 길이(와 줄 수)를 유지하는 건 match.index로 줄 번호를 그대로 계산하기 위해서입니다.
 */
export function maskNonProse(content: string): string {
  return scanBodyLines(content)
    .map(({ text, inFence }) => (inFence ? blank(text) : text))
    .join('\n');
}

export function validateImageReferences(
  record: PostRecord,
  raw: string,
  options: ValidateOptions = {},
): Issue[] {
  const { absPath, relPath } = record;
  const issues: Issue[] = [];
  const offset = frontmatterOffset(raw);
  const prose = maskNonProse(record.content);
  const lineOf = (index: number) =>
    offset + prose.slice(0, index).split('\n').length;

  // **마크다운 이미지만** 검사한다. raw HTML `<img>`의 alt는 `check-seo`가
  // 최종 HTML에서 보고, 그 검사는 이제 `pnpm build`의 마지막 단계라 로컬에서도
  // 돈다 — 여기서 또 볼 이유가 없다.
  //
  // 여기서 raw HTML까지 훑어봤더니 산문에 인용한 `<img …>` 태그가 그대로
  // 위반으로 잡혔다. 렌더되면 `<code>` 텍스트라 실제 페이지에는 이미지가 없는데도
  // 엄격 모드에서 빌드를 막는, 글쓴이가 납득할 수 없는 실패다. 정작 alt 없는
  // raw `<img>`는 이 저장소 50개 글에 **0건**이다.
  const found = [...prose.matchAll(MARKDOWN_IMAGE)].map(m => ({
    alt: m[1],
    ref: m[2],
    index: m.index,
  }));

  for (const { alt, ref, index } of found) {
    // alt가 비면 스크린리더는 파일 URL을 읽거나 그냥 건너뛴다. 이미지가 다이어그램인
    // 이 블로그에서는 그림이 설명의 본체인 경우가 많아서 내용이 통째로 사라진다.
    //
    // 빌드에서 제외되는 메타 노트는 렌더될 일이 없으므로 검사하지 않는다 —
    // validatePost·validateBodyHeadings와 같은 기준(isPostFile).
    if (alt.trim() === '' && isPostFile(record.data)) {
      issues.push({
        file: relPath,
        line: lineOf(index),
        severity: seoSeverity(record.data, options),
        rule: 'missing-image-alt',
        message: `이미지에 alt 텍스트가 없습니다 — 스크린리더가 읽을 설명을 적어주세요: ${ref}`,
      });
    }

    if (
      /^https?:\/\//.test(ref) ||
      ref.startsWith('/') ||
      ref.startsWith('data:')
    ) {
      continue;
    }

    const cleanRef = decodeUrlSafe(ref.split('#')[0].split('?')[0]);
    const resolved = resolve(dirname(absPath), cleanRef);
    if (!existsSync(resolved)) {
      issues.push({
        file: relPath,
        line: lineOf(index),
        severity: 'error',
        rule: 'missing-image',
        message: `이미지 파일을 찾을 수 없습니다: ${cleanRef}`,
      });
    }
  }
  return issues;
}

export interface ScannedLine {
  text: string;
  /** 본문 기준 0-based 줄 번호 */
  index: number;
  /** 코드 펜스 안(여는·닫는 펜스 줄 포함)이면 true */
  inFence: boolean;
  /**
   * 이 줄이 펜스를 **여는** 줄이면 info string, 아니면 `null`.
   *
   * 라벨 없는 펜스(``` 만 있는 줄)는 빈 문자열 `''`입니다 — "여는 줄이 아니다"
   * (`null`)와 "열지만 언어 라벨이 없다"(`''`)는 다른 상태라 구분합니다.
   * 여는 줄인지만 볼 때는 `!== null`로, 라벨이 있는지까지 볼 때는 truthy로 봅니다.
   */
  opensFence: string | null;
}

/**
 * 본문을 줄 단위로 훑으면서 각 줄이 코드 펜스 안인지 표시합니다.
 *
 * 마크다운을 다루는 글이 코드 예시로 펜스를 품는 경우가 흔해서, 여는 펜스의
 * **문자(백틱/틸데)와 개수**를 함께 기억했다가 같은 문자·같은 개수 이상의
 * 라벨 없는 펜스로 닫힐 때까지는 안쪽을 본문으로 보지 않습니다(CommonMark 규칙).
 *
 * 개수만 보고 문자를 무시하면 ```로 연 펜스가 안쪽 `~~~`로 닫힌 것처럼 보여,
 * 그 뒤의 코드 줄들이 본문으로 새어 나옵니다 — `# 주석` 한 줄이 고칠 수 없는
 * body-h1 경고가 되는 식입니다.
 *
 * 펜스 규칙을 두 검사(코드 라벨·본문 h1)가 각자 구현하면 한쪽만 고쳐질 수 있어
 * 하나로 모았습니다.
 */
/**
 * 직전 `scanBodyLines` 호출에서 **끝까지 닫히지 않은** 펜스가 열린 줄 인덱스.
 * (스캐너가 줄 배열만 반환하는 계약을 유지하려고 곁에 둔 값 — 같은 모듈 안에서
 * 바로 이어 읽습니다.)
 */
let unclosedFenceAt: number | null = null;

export function scanBodyLines(content: string): ScannedLine[] {
  const result: ScannedLine[] = [];
  unclosedFenceAt = null;
  let fenceChar = '';
  let fenceLength = 0;
  // 열려 있는 펜스가 차지한 줄 인덱스. 끝까지 안 닫히면 되돌린다.
  let openedAt: number[] = [];

  content.split('\n').forEach((text, index) => {
    // `[^\n]*`로 받는다: CRLF 파일에서 줄 끝의 `\r`을 `.`이 먹지 못해
    // 펜스가 하나도 인식되지 않고, 그러면 아무것도 마스킹되지 않는다.
    const m = text.match(/^(\s{0,3})(`{3,}|~{3,})([^\n]*)$/);
    if (!m) {
      result.push({
        text,
        index,
        inFence: fenceLength > 0,
        opensFence: null,
      });
      if (fenceLength > 0) openedAt.push(index);
      return;
    }

    const [, , marker, rest] = m;
    const char = marker[0];
    const length = marker.length;
    const info = rest.trim();

    if (fenceLength > 0) {
      if (char === fenceChar && length >= fenceLength && info === '') {
        fenceChar = '';
        fenceLength = 0;
        openedAt = [];
      }
      result.push({ text, index, inFence: true, opensFence: null });
      if (fenceLength > 0) openedAt.push(index);
      return;
    }

    fenceChar = char;
    fenceLength = length;
    openedAt = [index];
    result.push({ text, index, inFence: true, opensFence: info });
  });

  // 끝까지 닫히지 않은 펜스는 **펜스가 아니었던 것으로** 되돌린다.
  //
  // 열린 채로 두면 오타 하나(닫는 ```를 빠뜨렸거나, 산문에 `~~~~ 구분선`을 쓴 것)
  // 때문에 그 아래 본문 전체가 코드로 취급되어 이미지·헤딩 검사가 통째로 멈춘다.
  // 검사기가 조용히 검사를 끄는 것보다, 코드 블록 안을 한 번 더 보는 편이 낫다.
  for (const index of openedAt) {
    // 펜스가 아니었으므로 언어 라벨도 아니다. 안 닫힌 펜스 자체는
    // validateCodeFenceLanguages가 `unclosed-fence`로 따로 알린다 — 라벨 오타보다
    // "펜스가 안 닫혔다"가 더 큰 문제이고, 산문의 `~~~~ 구분선`을 언어 이름으로
    // 보고하는 모순도 사라진다.
    result[index] = { ...result[index], inFence: false, opensFence: null };
  }
  unclosedFenceAt = openedAt.length > 0 ? openedAt[0] : null;

  return result;
}

/**
 * 코드 펜스의 언어 라벨이 CodeBlock에 등록된 언어인지 검사합니다.
 *
 * CodeBlock은 refractor 전 언어를 번들하는 대신 `prismLanguages.ts`에 적힌
 * 언어만 등록합니다(번들 gzip 350KB 절감). 등록되지 않은 라벨은 에러 없이
 * 그냥 강조 없는 평문으로 렌더되기 때문에, 글쓴이가 알아채기 어렵습니다.
 * 그 조용한 품질 저하를 빌드 시점 경고로 끌어올립니다.
 */
export function validateCodeFenceLanguages(
  record: PostRecord,
  raw: string,
): Issue[] {
  const issues: Issue[] = [];
  const offset = frontmatterOffset(raw);

  const scanned = scanBodyLines(record.content);
  if (unclosedFenceAt !== null) {
    issues.push({
      file: record.relPath,
      line: offset + unclosedFenceAt + 1,
      severity: 'warning',
      rule: 'unclosed-fence',
      message:
        '코드 펜스가 끝까지 닫히지 않았습니다 — 닫는 펜스를 넣거나, 구분선이라면 `---`를 쓰세요. (닫히지 않은 펜스는 코드 블록으로 보지 않습니다)',
    });
  }

  for (const { index, opensFence } of scanned) {
    if (!opensFence) continue;

    // ```ts title="a.ts" 처럼 뒤에 메타가 붙는 경우 첫 토큰만 언어다.
    const label = opensFence.split(/[\s,{]/)[0].toLowerCase();
    if (!label || SUPPORTED_FENCE_LABELS.has(label)) continue;

    issues.push({
      file: record.relPath,
      line: offset + index + 1,
      severity: 'warning',
      rule: 'unregistered-code-language',
      message: `구문 강조에 등록되지 않은 언어입니다: \`${label}\` — 강조 없이 평문으로 렌더됩니다. src/components/post/prismLanguages.ts에 추가하거나 평문 라벨(text)을 쓰세요.`,
    });
  }

  return issues;
}

/**
 * 본문에 `# ` 헤딩(h1)이 있는지 검사합니다.
 *
 * 페이지의 h1은 글 제목 하나뿐이어야 하는데, 예전 글들은 본문 첫 줄에 제목을
 * 한 번 더 적거나 절 제목을 `#`으로 시작해서 렌더된 HTML에 h1이 2~4개 있었습니다.
 * 렌더 계층이 h1을 h2로 강등해 페이지 자체는 이제 항상 h1 하나지만
 * (src/components/post/markdownHeadings.tsx), 그 조용한 교정 때문에 글쓴이는
 * 원문이 틀렸다는 걸 영영 모릅니다. `hero`와 같은 방식으로 그 침묵을 깹니다.
 *
 * 검사는 `maskNonProse`를 지난 본문에서 합니다 — 코드 펜스 안의 `# 주석`은
 * 헤딩이 아니라 코드 예시라, 그대로 검사하면 손댈 수 없는 경고가 나옵니다.
 *
 * 마크다운 문법(ATX·setext)만 봅니다. raw HTML `<h1>`은 보지 않습니다 —
 * 렌더된 h1 개수는 `check-seo`가 최종 HTML에서 세고(그 검사는 `pnpm build`의
 * 마지막 단계라 로컬에서도 돕니다), 여기서 태그를 찾으면 산문에 인용한
 * `` `<h1>` `` 까지 잡혀 고칠 수 없는 경고가 됩니다(이미지 검사와 같은 판단).
 *
 * 빌드에서 제외되는 메타 노트(유효한 `status` 없음)는 렌더될 일이 없으므로
 * 검사하지 않습니다 — 기획 문서의 `# 제목`까지 잡으면 경고만 늘고 고칠 것이 없습니다.
 */
export function validateBodyHeadings(record: PostRecord, raw: string): Issue[] {
  if (!isPostFile(record.data)) return [];

  const issues: Issue[] = [];
  const offset = frontmatterOffset(raw);

  // 마스킹된 본문은 줄 수와 각 줄의 길이가 원본과 같으므로 줄 번호가 그대로다.
  // 펜스 안은 이미 공백으로 덮여 있어 따로 inFence를 볼 필요가 없다.
  const lines = maskNonProse(record.content).split('\n');
  // 메시지에 인용할 줄은 **원문**이다. 마스킹된 줄을 그대로 보여주면
  // ``# `useEffect` `` 가 `: #` 로만 찍혀 어디를 고칠지 알 수 없다.
  // (마스킹은 길이와 줄 수를 유지하므로 인덱스가 그대로 맞는다)
  const originalLines = record.content.split('\n');
  for (const [index, text] of lines.entries()) {
    // ATX(`# 제목`)와 setext(`제목` 다음 줄에 `===`) 둘 다 h1로 렌더된다.
    // ATX만 보면 setext h1은 조용히 강등되고 경고도 안 나와, 이 규칙이 존재하는
    // 이유(조용한 교정을 드러내기)가 그대로 무너진다.
    //
    // ATX는 앞 공백 3칸까지 허용된다(CommonMark). `/^# /`로만 보면 들여쓴 h1이
    // 그대로 렌더되는데 lint는 조용하다.
    const isAtx = /^ {0,3}# /.test(text);
    // setext 밑줄은 **문단** 뒤에만 붙는다. 목록 항목·표·인용·raw HTML 블록 뒤의
    // `===`는 헤딩이 아니므로, 그런 줄은 후보에서 뺀다 — 안 그러면 글쓴이가
    // 손댈 수 없는 경고가 나온다.
    const next = lines[index + 1];
    const isParagraphLine =
      text.trim() !== '' &&
      // 목록 마커는 뒤에 공백이 와야 목록이다 — `**중요한 제목**`을 목록으로
      // 오인하면 진짜 setext h1을 놓친다.
      !/^ {0,3}(?:#{1,6} |[-*+](?:\s|$)|\d+[.)](?:\s|$)|[>|]|<)/.test(text);
    const isSetext =
      isParagraphLine && next !== undefined && /^ {0,3}=+\s*$/.test(next);
    if (!isAtx && !isSetext) continue;

    issues.push({
      file: record.relPath,
      line: offset + index + 1,
      severity: 'warning',
      rule: 'body-h1',
      message: `본문에 h1(${isAtx ? '`# `' : '밑줄 `===`'})이 있습니다 — 페이지의 h1은 글 제목 하나뿐이어야 합니다. 제목의 중복이면 줄을 지우고, 절 제목이면 \`## \`로 내리세요. (렌더 시에는 h2로 강등되지만 원문은 그대로입니다): ${(originalLines[index] ?? text).trim()}`,
    });
  }

  return issues;
}

// 명시 slug가 없으면 파일경로(확장자 제거)를 기본 slug로 사용 — repository.ts의 rawSlug 규칙과 동일
function deriveDefaultSlug(relPath: string): string {
  return relPath.replace(/\.(md|mdx)$/, '');
}

/**
 * 발행될 글들의 meta description이 서로 완전히 겹치는지 검사합니다.
 *
 * `check-seo`가 빌드 산출물에서 잡는 duplicate-description과 **같은 조건**을 원문에서
 * 먼저 봅니다. 여기 규칙이 없으면 로컬 검사와 빌드는 통과하고 CI만 실패합니다 —
 * strict 모드를 넣은 이유가 바로 그 간극을 없애는 것이었습니다.
 *
 * 비교 대상은 `excerpt`가 아니라 **실제로 나갈 description**입니다. excerpt를 비워 둔
 * 글들은 본문 앞부분 자동 발췌로 폴백하는데, 도입부가 비슷한 시리즈 글끼리는 그 발췌가
 * 글자 단위로 겹칩니다(실제로 본편/DI편 두 쌍이 그랬습니다). 폴백 계산은 도메인의
 * resolveExcerpt 하나를 씁니다.
 *
 * 비교 대상은 **지금 빌드에 실리는 글**뿐입니다(seoSeverity와 같은 기준). 아직
 * 공개 전인 예약 글을 섞으면, 산출물에는 존재하지도 않는 충돌 때문에 이미 발행된
 * 글이 빌드를 막습니다.
 */
export function detectDuplicateDescriptions(
  records: PostRecord[],
  options: ValidateOptions = {},
): Issue[] {
  const byDescription = new Map<string, PostRecord[]>();
  for (const record of records) {
    if (!isPostFile(record.data) || !isVisibleFrontmatter(record.data))
      continue;
    const description = resolveExcerpt(record.content, record.data.excerpt);
    const arr = byDescription.get(description) ?? [];
    arr.push(record);
    byDescription.set(description, arr);
  }

  const issues: Issue[] = [];
  for (const [description, group] of byDescription) {
    if (group.length < 2) continue;
    for (const record of group) {
      issues.push({
        file: record.relPath,
        line: null,
        severity: seoSeverity(record.data, options),
        rule: 'duplicate-description',
        message: `meta description이 다른 글과 완전히 같습니다 — 중복 콘텐츠 신호가 되어 한쪽이 색인에서 밀립니다. 고유한 \`excerpt\`를 적어주세요 (겹치는 글: ${group
          .filter(other => other !== record)
          .map(other => other.relPath)
          .join(', ')}): "${description.slice(0, 40)}…"`,
      });
    }
  }
  return issues;
}

export function detectDuplicateSlugs(records: PostRecord[]): Issue[] {
  const slugMap = new Map<string, string[]>();
  for (const r of records) {
    const explicit = typeof r.data.slug === 'string' ? r.data.slug : null;
    const effective = explicit ?? deriveDefaultSlug(r.relPath);
    const arr = slugMap.get(effective) ?? [];
    arr.push(r.relPath);
    slugMap.set(effective, arr);
  }

  const issues: Issue[] = [];
  for (const [slug, files] of slugMap.entries()) {
    if (files.length < 2) continue;
    for (const file of files) {
      issues.push({
        file,
        line: null,
        severity: 'error',
        rule: 'duplicate-slug',
        message: `slug \`${slug}\`이(가) 다른 글과 충돌합니다 (명시 slug ↔ 파일명 기반 slug 포함 검사): ${files.filter(f => f !== file).join(', ')}`,
      });
    }
  }
  return issues;
}

function format(issue: Issue): string {
  const tag = issue.severity === 'error' ? '✖' : '⚠';
  const loc = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `  ${tag} ${loc}\n    [${issue.rule}] ${issue.message}`;
}

function main() {
  const options: ValidateOptions = {
    strict: process.argv.includes('--strict'),
  };
  const allFiles = collectMarkdownFiles(POSTS_DIR);
  const records: PostRecord[] = [];
  const allIssues: Issue[] = [];

  for (const absPath of allFiles) {
    const raw = readFileSync(absPath, 'utf8');
    if (!hasFrontmatter(raw)) continue;
    const { data, content } = matter(raw);
    const relPath = posix.normalize(relative(POSTS_DIR, absPath));
    const record: PostRecord = { absPath, relPath, data, content };
    records.push(record);
    allIssues.push(...validatePost(record, raw, options));
    allIssues.push(...validateImageReferences(record, raw, options));
    allIssues.push(...validateCodeFenceLanguages(record, raw));
    allIssues.push(...validateBodyHeadings(record, raw));
  }

  allIssues.push(...detectDuplicateSlugs(records));
  allIssues.push(...detectDuplicateDescriptions(records, options));

  if (allIssues.length === 0) {
    console.log(`✓ ${records.length}개 포스트 검증 통과`);
    process.exit(0);
  }

  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');

  console.log(
    `\n포스트 검증 결과: ${records.length}개 검사, 에러 ${errors.length}건, 경고 ${warnings.length}건\n`,
  );

  const grouped = new Map<string, Issue[]>();
  for (const issue of allIssues) {
    const arr = grouped.get(issue.file) ?? [];
    arr.push(issue);
    grouped.set(issue.file, arr);
  }
  for (const [file, issues] of grouped.entries()) {
    console.log(file);
    for (const issue of issues) {
      console.log(format(issue));
    }
    console.log('');
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

// 스크립트로 직접 실행될 때만 main()을 호출합니다.
// (테스트 등에서 import할 때 main()이 자동 실행되어 process.exit 하는 것을 방지)
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
