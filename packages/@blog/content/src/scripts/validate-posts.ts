/**
 * 포스트 원문 검증 CLI (`pnpm lint:posts` / prebuild `--strict`).
 *
 * 실제 검증 로직은 두 겹으로 나뉘어 `scripts/validate/`에 있습니다:
 *
 * - `rules.ts`       — 규칙 29개의 평면 테이블(id → 심각도·범위). "--strict가
 *                      무엇을 승격하는지"와 "무엇이 전체 집합을 보는지"는 여기서
 *                      열 하나로 읽힙니다
 * - `frontmatter.ts` / `body.ts` / `corpus.ts` — 실행 체크. 규칙 id 단위가
 *                      아니라 **판정 사슬** 단위(excerpt·date·scheduledDate·…)로
 *                      묶여 있고, 한 사슬이 여러 규칙 id를 낼 수 있습니다
 *
 * 이 파일은 CLI 진입점(파일 수집·리포트 출력)과, 기존 소비처(테스트·new-post)가
 * 쓰던 import 경로를 유지하는 재수출만 담당합니다.
 */
import { readFileSync } from 'node:fs';
import { relative, posix } from 'node:path';
import { isCliEntry } from './cliEntry';
import matter from 'gray-matter';
import { collectMarkdownFiles, hasFrontmatter } from '../shared/postFiles';
import { CONTENT_PATHS } from '../shared/contentPaths';
import type { Issue, PostRecord, ValidateOptions } from './validate/shared';
import { validatePost } from './validate/frontmatter';
import {
  validateImageReferences,
  validateCodeFenceLanguages,
  validateBodyHeadings,
} from './validate/body';
import {
  detectDuplicateSlugs,
  detectDuplicateDescriptions,
} from './validate/corpus';

// ── 재수출: 기존 import 경로('./validate-posts') 유지 ────────────────────────
export type { Issue, PostRecord, ValidateOptions } from './validate/shared';
export {
  RULES,
  SEO_PUBLISH,
  resolveSeverity,
  isVisibleFrontmatter,
  type RuleId,
  type RuleScope,
} from './validate/rules';
export { validatePost } from './validate/frontmatter';
export {
  maskNonProse,
  scanBodyLines,
  markParagraphLines,
  validateImageReferences,
  validateCodeFenceLanguages,
  validateBodyHeadings,
  type ScannedLine,
  type ScanResult,
} from './validate/body';
export {
  detectDuplicateSlugs,
  detectDuplicateDescriptions,
} from './validate/corpus';

const POSTS_DIR = CONTENT_PATHS.postsDir;

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
if (isCliEntry(import.meta.url)) {
  main();
}
