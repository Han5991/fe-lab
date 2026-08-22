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
import matter from 'gray-matter';
import { collectMarkdownFiles, hasFrontmatter } from '../shared/postFiles.ts';
import type { ContentContext } from './context.ts';
import type { Issue, PostRecord, ValidateOptions } from './validate/shared.ts';
import { validatePost } from './validate/frontmatter.ts';
import {
  validateImageReferences,
  validateCodeFenceLanguages,
  validateBodyHeadings,
} from './validate/body.ts';
import {
  detectDuplicateSlugs,
  detectDuplicateDescriptions,
} from './validate/corpus.ts';

// ── 재수출: 기존 import 경로('./validate-posts') 유지 ────────────────────────
export type { Issue, PostRecord, ValidateOptions } from './validate/shared.ts';
export {
  RULES,
  SEO_PUBLISH,
  resolveSeverity,
  isVisibleFrontmatter,
  type RuleId,
  type RuleScope,
} from './validate/rules.ts';
export { validatePost } from './validate/frontmatter.ts';
export {
  maskNonProse,
  scanBodyLines,
  markParagraphLines,
  validateImageReferences,
  validateCodeFenceLanguages,
  validateBodyHeadings,
  type ScannedLine,
  type ScanResult,
} from './validate/body.ts';
export {
  detectDuplicateSlugs,
  detectDuplicateDescriptions,
} from './validate/corpus.ts';

function format(issue: Issue): string {
  const tag = issue.severity === 'error' ? '✖' : '⚠';
  const loc = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `  ${tag} ${loc}\n    [${issue.rule}] ${issue.message}`;
}

export function main(ctx: ContentContext, options: ValidateOptions) {
  const postsDir = ctx.paths.postsDir;
  const allFiles = collectMarkdownFiles(postsDir);
  const records: PostRecord[] = [];
  const allIssues: Issue[] = [];

  for (const absPath of allFiles) {
    const raw = readFileSync(absPath, 'utf8');
    if (!hasFrontmatter(raw)) continue;
    const { data, content } = matter(raw);
    const relPath = posix.normalize(relative(postsDir, absPath));
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
