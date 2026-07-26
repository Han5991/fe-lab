import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve, dirname, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { collectMarkdownFiles, hasFrontmatter } from '@/lib/postFiles';
import { hasAmbiguousTimezone } from '@/lib/dates';
import { POST_STATUSES, isPostStatus, isPostFile } from '@/domain/post';

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
  'date',
  'updatedAt',
  'slug',
  'excerpt',
  'thumbnail',
  'tags',
  'status',
  'scheduledDate',
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

export function validatePost(record: PostRecord, raw: string): Issue[] {
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
  for (const key of ['slug', 'excerpt', 'thumbnail'] as const) {
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

  if (data.date != null) {
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
    // 공개 시각은 scheduledDate가 있으면 그것, 없으면 date (visibility.ts와 동일 규칙).
    // 둘 다 없으면 영원히 비공개가 되므로 에러로 막습니다.
    if (typeof data.scheduledDate !== 'string' && data.date == null) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'status'),
        severity: 'error',
        rule: 'scheduled-without-date',
        message:
          '`status: scheduled`에는 `scheduledDate` 또는 `date` 중 하나가 필요합니다. 둘 다 없으면 영원히 비공개 처리됩니다. (시각까지 지정할 때만 `scheduledDate`를 쓰고, 날짜만 쓸 거면 `date`로 충분합니다)',
      });
    } else if (
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
    }
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

function validateImageReferences(record: PostRecord, raw: string): Issue[] {
  const { content, absPath, relPath } = record;
  const issues: Issue[] = [];
  const imageRegex = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const offset = frontmatterOffset(raw);

  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(content)) !== null) {
    const ref = match[1];
    if (
      /^https?:\/\//.test(ref) ||
      ref.startsWith('/') ||
      ref.startsWith('data:')
    ) {
      continue;
    }

    const cleanRef = decodeURIComponent(ref.split('#')[0].split('?')[0]);
    const resolved = resolve(dirname(absPath), cleanRef);
    if (!existsSync(resolved)) {
      const lineInContent = content.slice(0, match.index).split('\n').length;
      issues.push({
        file: relPath,
        line: offset + lineInContent,
        severity: 'error',
        rule: 'missing-image',
        message: `이미지 파일을 찾을 수 없습니다: ${cleanRef}`,
      });
    }
  }
  return issues;
}

// 명시 slug가 없으면 파일경로(확장자 제거)를 기본 slug로 사용 — repository.ts의 rawSlug 규칙과 동일
function deriveDefaultSlug(relPath: string): string {
  return relPath.replace(/\.(md|mdx)$/, '');
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
    allIssues.push(...validatePost(record, raw));
    allIssues.push(...validateImageReferences(record, raw));
  }

  allIssues.push(...detectDuplicateSlugs(records));

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
