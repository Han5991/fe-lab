/**
 * 포스트 원문 검증 CLI (`pnpm lint:posts` / prebuild `--strict`).
 *
 * 실제 검증 로직은 두 겹으로 나뉘어 `scripts/validate/`에 있습니다:
 *
 * - `rules.ts`       — 규칙 전체의 평면 테이블(id → 심각도·범위). "--strict가
 *                      무엇을 승격하는지"와 "무엇이 전체 집합을 보는지"는 여기서
 *                      열 하나로 읽힙니다
 * - `frontmatter.ts` / `body.ts` / `corpus.ts` / `series.ts` — 실행 체크. 규칙 id 단위가
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
import { toValidateContext } from './validate/shared.ts';
import type {
  Issue,
  PostRecord,
  ValidateContext,
  ValidateOptions,
} from './validate/shared.ts';
import { validatePost } from './validate/frontmatter.ts';
import { resolveSeverity } from './validate/rules.ts';
import {
  validateImageReferences,
  validateCodeFenceLanguages,
  validateBodyHeadings,
} from './validate/body.ts';
import {
  detectDuplicateSlugs,
  detectDuplicateDescriptions,
} from './validate/corpus.ts';
import { validateSeriesDeclarations } from './validate/series.ts';

// ── 재수출: 기존 import 경로('./validate-posts') 유지 ────────────────────────
export type {
  Issue,
  PostRecord,
  ValidateContext,
  ValidateOptions,
} from './validate/shared.ts';
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

/**
 * 파일 하나를 검사용 레코드로 읽는다. frontmatter YAML이 깨졌으면 레코드 대신
 * **그 파일을 가리키는 이슈**를 돌려준다.
 *
 * gray-matter는 문법 오류에 `YAMLException`을 던지고, 메시지에는 줄·열만 있고
 * 파일 이름이 없다. 예전에는 그게 그대로 CLI를 멈춰서, 글쓴이가 70개 가까운
 * `.md`(`---`로 시작하는 작업 노트 포함)를 손으로 이분 탐색해야 했다. 여기서
 * 잡아 이슈로 바꾸면 나머지 파일도 끝까지 검사된다.
 */
export function parseRecord(
  raw: string,
  absPath: string,
  relPath: string,
): { record: PostRecord } | { issue: Issue } {
  try {
    const { data, content } = matter(raw);
    return { record: { absPath, relPath, data, content } };
  } catch (e) {
    const mark = (e as { mark?: { line?: unknown } } | null)?.mark;
    // js-yaml의 mark.line은 0-based이고, gray-matter가 넘기는 YAML은 여는 `---`
    // 줄의 끝(개행)부터 시작한다 — 그래서 +1이 곧 파일의 줄 번호다.
    const line = typeof mark?.line === 'number' ? mark.line + 1 : 1;
    const reason = e instanceof Error ? e.message.split('\n')[0] : String(e);
    return {
      issue: {
        file: relPath,
        line,
        severity: resolveSeverity('invalid-frontmatter-yaml', {}),
        rule: 'invalid-frontmatter-yaml',
        message: `frontmatter YAML을 읽을 수 없습니다 — 빌드의 로더가 이 파일에서 멈춥니다. 콜론이 든 값은 따옴표로 감싸세요: ${reason}`,
      },
    };
  }
}

function format(issue: Issue): string {
  const tag = issue.severity === 'error' ? '✖' : '⚠';
  const loc = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `  ${tag} ${loc}\n    [${issue.rule}] ${issue.message}`;
}

export function main(ctx: ContentContext, runOptions: ValidateOptions) {
  const postsDir = ctx.content.paths.postsDir;
  // 규칙이 참조하는 설정 슬라이스를 여기서 한 번 채운다 — 규칙 파일이 상수를
  // 직접 읽던 시절엔 defineContent로 덮어도 이 게이트만 옛 값을 봤다.
  const options: ValidateContext = toValidateContext(ctx.content.config, {
    ...runOptions,
    // strict 승격 범위(지금 공개되는 글)도 생성 단계와 같은 기준 시각으로 판정한다.
    now: ctx.now,
  });
  const allFiles = collectMarkdownFiles(
    postsDir,
    ctx.content.config.registries.metaFilenames,
  );
  const records: PostRecord[] = [];
  const allIssues: Issue[] = [];

  for (const absPath of allFiles) {
    const raw = readFileSync(absPath, 'utf8');
    if (!hasFrontmatter(raw)) continue;
    const relPath = posix.normalize(relative(postsDir, absPath));
    const parsed = parseRecord(raw, absPath, relPath);
    if ('issue' in parsed) {
      allIssues.push(parsed.issue);
      continue;
    }
    const { record } = parsed;
    records.push(record);
    allIssues.push(...validatePost(record, raw, options));
    allIssues.push(...validateImageReferences(record, raw, options));
    allIssues.push(
      ...validateCodeFenceLanguages(
        record,
        raw,
        ctx.content.config.registries.supportedFenceLabels,
      ),
    );
    allIssues.push(...validateBodyHeadings(record, raw));
  }

  allIssues.push(...detectDuplicateSlugs(records));
  allIssues.push(...detectDuplicateDescriptions(records, options));
  allIssues.push(
    ...validateSeriesDeclarations(postsDir, records, path =>
      readFileSync(path, 'utf8'),
    ),
  );

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
