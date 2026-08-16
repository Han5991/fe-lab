import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isCliEntry } from './cliEntry';

/** argv[1]을 임시로 바꿔 놓고 fn을 실행한다 (undefined면 잘라낸다). */
function withArgv1<T>(argv1: string | undefined, fn: () => T): T {
  const saved = process.argv;
  process.argv =
    argv1 === undefined ? saved.slice(0, 1) : [...saved.slice(0, 1), argv1];
  try {
    return fn();
  } finally {
    process.argv = saved;
  }
}

test('isCliEntry: argv[1]이 모듈 자신(실경로)이면 true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-entry-'));
  try {
    const script = join(dir, 'entry.ts');
    writeFileSync(script, '');
    const url = pathToFileURL(script).href;
    assert.equal(
      withArgv1(script, () => isCliEntry(url)),
      true,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('isCliEntry: argv[1]이 심링크여도 실경로가 같으면 true (pnpm node_modules 재현)', () => {
  // 무음 no-op 회귀의 핵심: 앱은 node_modules/@blog/content/... 심링크 경로로
  // 스크립트를 부르는데, import.meta.url은 ESM 로더가 해석한 실경로다.
  // href 문자열 비교는 이 경우 항상 false였다.
  const dir = mkdtempSync(join(tmpdir(), 'cli-entry-'));
  try {
    const script = join(dir, 'entry.ts');
    writeFileSync(script, '');
    const link = join(dir, 'link.ts');
    symlinkSync(script, link);
    const realUrl = pathToFileURL(script).href;
    assert.equal(
      withArgv1(link, () => isCliEntry(realUrl)),
      true,
    );
    // 종전 가드(문자열 비교)라면 false였을 조합임을 함께 잠근다.
    assert.notEqual(pathToFileURL(link).href, realUrl);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('isCliEntry: 다른 파일이 진입점이면 false (import 시 우발 실행 방지)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-entry-'));
  try {
    const script = join(dir, 'entry.ts');
    const other = join(dir, 'other.ts');
    writeFileSync(script, '');
    writeFileSync(other, '');
    assert.equal(
      withArgv1(other, () => isCliEntry(pathToFileURL(script).href)),
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('isCliEntry: 판정 불가 입력은 전부 안전하게 false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-entry-'));
  try {
    const script = join(dir, 'entry.ts');
    writeFileSync(script, '');
    const url = pathToFileURL(script).href;
    // argv[1] 부재 (node -e / REPL)
    assert.equal(
      withArgv1(undefined, () => isCliEntry(url)),
      false,
    );
    // argv[1]이 존재하지 않는 경로 → realpath 실패
    assert.equal(
      withArgv1(join(dir, 'missing.ts'), () => isCliEntry(url)),
      false,
    );
    // import.meta.url이 file: URL이 아님 → fileURLToPath 실패
    assert.equal(
      withArgv1(script, () => isCliEntry('https://example.com/entry.ts')),
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
