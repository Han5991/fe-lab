import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, posix } from 'node:path';
import matter from 'gray-matter';

const POSTS_DIR = resolve(process.cwd(), '..', 'posts');
const VALID_STATUSES = ['published', 'draft', 'scheduled'] as const;

type Severity = 'error' | 'warning';

interface Issue {
  file: string;
  line: number | null;
  severity: Severity;
  rule: string;
  message: string;
}

interface PostRecord {
  absPath: string;
  relPath: string;
  data: Record<string, unknown>;
  content: string;
}

function collectMarkdownFiles(dir: string, results: string[] = []): string[] {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectMarkdownFiles(full, results);
      continue;
    }
    if (item.endsWith('.md') || item.endsWith('.mdx')) {
      results.push(full);
    }
  }
  return results;
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

function isMetaFile(absPath: string): boolean {
  const name = absPath.split('/').pop() ?? '';
  return ['PLAN.md', 'THUMBNAIL_LOG.md', 'STUDY_LOG.md'].includes(name);
}

function hasFrontmatter(raw: string): boolean {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return true;
  }
  return false;
}

function validatePost(record: PostRecord, raw: string): Issue[] {
  const { data, relPath, absPath } = record;
  const issues: Issue[] = [];

  const hasAnyVisibilityField =
    'status' in data || 'published' in data || 'slug' in data;
  if (!hasAnyVisibilityField) {
    issues.push({
      file: relPath,
      line: 1,
      severity: 'warning',
      rule: 'meta-file-skipped',
      message:
        '`status`, `published`, `slug` 중 어느 것도 없어 빌드에서 제외됩니다. 메타 파일이면 무시해도 됩니다.',
    });
    return issues;
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
    }
  }

  if ('status' in data) {
    if (
      typeof data.status !== 'string' ||
      !VALID_STATUSES.includes(data.status as (typeof VALID_STATUSES)[number])
    ) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'status'),
        severity: 'error',
        rule: 'invalid-status',
        message: `\`status\`는 ${VALID_STATUSES.join(', ')} 중 하나여야 합니다.`,
      });
    }
  }

  if (data.status === 'scheduled') {
    if (typeof data.scheduledDate !== 'string') {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'status'),
        severity: 'error',
        rule: 'scheduled-without-date',
        message:
          '`status: scheduled`인 경우 `scheduledDate` 필드가 필수입니다. 누락 시 항상 비공개 처리됩니다.',
      });
    } else if (Number.isNaN(Date.parse(data.scheduledDate))) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'scheduledDate'),
        severity: 'error',
        rule: 'invalid-scheduled-date',
        message: `\`scheduledDate\`가 유효한 날짜가 아닙니다: ${data.scheduledDate}`,
      });
    }
  }

  if ('tags' in data && !Array.isArray(data.tags)) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'tags'),
      severity: 'error',
      rule: 'invalid-tags',
      message: '`tags`는 배열이어야 합니다. 예: `tags: [bundler, build]`',
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

function detectDuplicateSlugs(records: PostRecord[]): Issue[] {
  const slugMap = new Map<string, string[]>();
  for (const r of records) {
    const explicit = typeof r.data.slug === 'string' ? r.data.slug : null;
    if (!explicit) continue;
    const arr = slugMap.get(explicit) ?? [];
    arr.push(r.relPath);
    slugMap.set(explicit, arr);
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
        message: `slug \`${slug}\`이(가) 다른 글과 중복됩니다: ${files.filter(f => f !== file).join(', ')}`,
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
    if (isMetaFile(absPath)) continue;
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

main();
