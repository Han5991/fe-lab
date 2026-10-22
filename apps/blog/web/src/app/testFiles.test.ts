/**
 * 테스트 파일은 전부 러너가 돌린다 — vitest(`UNIT_TESTS`) 아니면 Playwright(`E2E_FILES`).
 *
 * vitest·ESLint·Panda는 testFiles.mts에서 파생하지만, tsconfig는 JSON이라 import할 수 없다.
 * 어긋남은 조용하다: 타입 검사와 lint는 받는데 어느 러너도 돌리지 않는 테스트가 생긴다
 * (2026-10 감사 때 src/{domain,lib}의 `.test.tsx`와 src 밖의 `.test.ts`가 그 자리였다).
 * 글롭 문자열이 아니라 TypeScript가 실제로 고른 파일 목록을 비교한다.
 *
 * 재평가: 2027-04-22 — 그때까지 한 번도 실패한 적이 없으면 줄이거나 내린다.
 */
import { execFileSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, test } from 'vitest';
import { E2E_FILES, TEST_PROGRAM_FILES, UNIT_TESTS } from '@/testFiles.mts';

// jsdom 환경의 전역 URL은 node의 것이 아니라 문자열에서 바로 푼다.
const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** 테스트처럼 이름 붙은 소스 파일 — 확장자를 넓게 잡아 러너 글롭 밖의 것까지 본다. */
const TEST_NAMED = /\.(test|spec)\.[cm]?[jt]sx?$/;

function files(patterns: string | readonly string[]): Set<string> {
  return new Set(globSync(patterns, { cwd: APP_ROOT }));
}

/**
 * 이 앱의 원본 파일 — 커밋됐거나 .gitignore 밖의 새 파일(산출물·의존성 폴더 제외).
 * `-z`로 받는다: 기본 출력은 비ASCII 경로를 따옴표·8진수로 감싸(`core.quotePath`) 이름 검사를
 * 조용히 빠져나간다.
 */
function sourceFiles(): string[] {
  return execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: APP_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
    .split('\0')
    .filter(Boolean);
}

/** tsconfig가 include·exclude로 고른 루트 파일(선언 파일 제외). */
function programRoots(tsconfig: string): Set<string> {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    join(APP_ROOT, tsconfig),
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: diagnostic => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        );
      },
    },
  );
  if (!parsed) throw new Error(`${tsconfig}를 읽지 못했다`);
  if (parsed.errors.length > 0) {
    throw new Error(
      parsed.errors
        .map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n'))
        .join('\n'),
    );
  }
  return new Set(
    parsed.fileNames
      .map(file => relative(APP_ROOT, file))
      .filter(file => !file.endsWith('.d.ts')),
  );
}

const SELF = 'src/app/testFiles.test.ts';
const unit = files(UNIT_TESTS);
const e2e = files(E2E_FILES);
// 선언 파일은 프로그램 루트 비교(programRoots)에서처럼 뺀다 — 테스트가 아니다.
const testProgram = new Set(
  [...files(TEST_PROGRAM_FILES)].filter(file => !file.endsWith('.d.ts')),
);

test('글롭과 파일 목록이 실제 파일을 고른다 — 아무것도 안 보는 0건이 아니다', () => {
  expect(unit.has(SELF)).toBe(true);
  expect([...e2e].some(file => file.endsWith('.spec.ts'))).toBe(true);
  expect(sourceFiles()).toContain(SELF);
});

test('테스트처럼 이름 붙은 파일은 vitest나 Playwright가 돌리는 자리에만 있다', () => {
  const stray = sourceFiles().filter(
    file => TEST_NAMED.test(file) && !unit.has(file) && !e2e.has(file),
  );
  expect(stray).toEqual([]);
});

test('tsconfig.test.json은 testFiles.mts의 테스트 프로그램과 같은 파일을 검사한다', () => {
  const roots = programRoots('tsconfig.test.json');
  expect([...roots].filter(file => !testProgram.has(file))).toEqual([]);
  expect([...testProgram].filter(file => !roots.has(file))).toEqual([]);
});

test('tsconfig.json(프로덕션)은 테스트 프로그램의 파일을 검사하지 않는다', () => {
  const roots = programRoots('tsconfig.json');
  // 양성 대조: 프로덕션 프로그램이 비어 있으면 아래 교집합은 언제나 빈다.
  expect(roots.has('src/app/layout.tsx')).toBe(true);
  expect([...testProgram].filter(file => roots.has(file))).toEqual([]);
});
