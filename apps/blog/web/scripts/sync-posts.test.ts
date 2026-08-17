/**
 * sync-posts.mjs 통합 테스트
 *
 * 임시 src/dst 디렉토리를 만들어 sync 로직을 실행하고
 * orphan 파일 삭제(및 dry-orphan 모드) 동작을 검증합니다.
 *
 * sync-posts.mjs 는 로드 시점에 CONTENT_PATHS의 실제 경로로 즉시 실행되는
 * 구조라(진입 가드 없음) 직접 import 하면 진짜 public/을 건드립니다. 그래서
 * 동일한 핵심 로직을 인라인 wrapper 로 래핑한 뒤 spawnSync 로 실행하여
 * 임시 경로를 주입합니다. 실제 파일의 경로 배선(CONTENT_PATHS 소비)은
 * 패키지 이사 후 진입 가드가 생기면 직접 import 로 검증합니다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

// ── inline wrapper builder ─────────────────────────────────────────────────

/**
 * 주어진 srcDir / dstDir 을 사용하는 sync 로직 스크립트를 임시 파일로 작성하고
 * node 로 실행합니다.
 */
function runSync(
  srcDir: string,
  dstDir: string,
  extraArgs: string[] = [],
): { stdout: string; stderr: string; status: number } {
  const wrapperCode = `
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';

const POSTS_SOURCE_DIR = ${JSON.stringify(srcDir)};
const POSTS_TARGET_DIR = ${JSON.stringify(dstDir)};

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4'];
const FORCE = process.argv.includes('--force');
const DRY_ORPHAN = process.argv.includes('--dry-orphan');

function listMediaFiles(dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) { listMediaFiles(full, results); continue; }
    if (ALLOWED_EXTENSIONS.includes(extname(item).toLowerCase())) {
      results.push({ full, mtimeMs: stat.mtimeMs, size: stat.size });
    }
  }
  return results;
}

function syncIncremental() {
  const sourceFiles = listMediaFiles(POSTS_SOURCE_DIR);
  const sourceRelSet = new Set(sourceFiles.map(f => relative(POSTS_SOURCE_DIR, f.full)));
  let copied = 0, skipped = 0, removed = 0;

  for (const src of sourceFiles) {
    const rel = relative(POSTS_SOURCE_DIR, src.full);
    const dst = join(POSTS_TARGET_DIR, rel);
    let needsCopy = true;
    if (existsSync(dst)) {
      const dstStat = statSync(dst);
      if (dstStat.size === src.size && dstStat.mtimeMs >= src.mtimeMs) needsCopy = false;
    }
    if (needsCopy) { mkdirSync(dirname(dst), { recursive: true }); copyFileSync(src.full, dst); copied++; }
    else skipped++;
  }

  if (existsSync(POSTS_TARGET_DIR)) {
    const targetFiles = listMediaFiles(POSTS_TARGET_DIR);
    for (const t of targetFiles) {
      const rel = relative(POSTS_TARGET_DIR, t.full);
      if (!sourceRelSet.has(rel)) {
        if (DRY_ORPHAN) { console.log('  [dry-orphan] would remove: ' + rel); }
        else { console.log('  [orphan] removing: ' + rel); rmSync(t.full); }
        removed++;
      }
    }
  }

  const dryNote = DRY_ORPHAN && removed > 0 ? ' (dry-orphan: 실제 삭제 안 함)' : '';
  console.log('Synced posts media: ' + copied + ' copied, ' + skipped + ' unchanged, ' + removed + ' removed' + dryNote);
}

function syncFull() {
  if (existsSync(POSTS_TARGET_DIR)) rmSync(POSTS_TARGET_DIR, { recursive: true, force: true });
  mkdirSync(POSTS_TARGET_DIR, { recursive: true });
  const sourceFiles = listMediaFiles(POSTS_SOURCE_DIR);
  for (const src of sourceFiles) {
    const rel = relative(POSTS_SOURCE_DIR, src.full);
    const dst = join(POSTS_TARGET_DIR, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src.full, dst);
  }
  console.log('Full sync: ' + sourceFiles.length + ' files copied');
}

try {
  if (FORCE || !existsSync(POSTS_TARGET_DIR)) syncFull();
  else syncIncremental();
} catch (error) {
  console.error('Failed to sync images:', error);
  process.exit(1);
}
`;

  const wrapperPath = join(tmpdir(), `sync-wrapper-${Date.now()}.mjs`);
  writeFileSync(wrapperPath, wrapperCode, 'utf8');

  const result = spawnSync(process.execPath, [wrapperPath, ...extraArgs], {
    encoding: 'utf8',
    timeout: 10_000,
  });

  try {
    rmSync(wrapperPath);
  } catch {
    /* ignore */
  }

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'sync-posts-test-'));
}

/**
 * 임시 src/dst 디렉토리를 만들어 fn에 넘기고, 종료 시 항상 정리합니다.
 * fn 안에서 assertion이 실패해도 finally가 실행되어 tmp dir이 누적되지 않습니다.
 */
function withTmpDirs(fn: (src: string, dst: string) => void): void {
  const src = makeTmpDir();
  const dst = makeTmpDir();
  try {
    fn(src, dst);
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
}

function writeFile(dir: string, relPath: string, content = 'x'): void {
  const full = join(dir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
}

// ── tests ───────────────────────────────────────────────────────────────────

test('sync: src 파일이 dst로 복사됨', () => {
  withTmpDirs((src, dst) => {
    writeFile(src, 'a/img.png', 'PNG');

    const result = runSync(src, dst);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(dst, 'a/img.png')), 'dst에 파일이 복사되어야 함');
    assert.ok(result.stdout.includes('1 copied'), result.stdout);
  });
});

test('orphan 삭제: src에 없는 dst 파일이 삭제됨', () => {
  withTmpDirs((src, dst) => {
    // dst에 orphan 파일 미리 생성
    writeFile(dst, 'orphan.png', 'ORPHAN');
    // src에는 다른 파일
    writeFile(src, 'real.jpg', 'REAL');

    const result = runSync(src, dst);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      !existsSync(join(dst, 'orphan.png')),
      'orphan 파일이 삭제되어야 함',
    );
    assert.ok(
      existsSync(join(dst, 'real.jpg')),
      'src 파일은 dst에 복사되어야 함',
    );
    assert.ok(result.stdout.includes('1 removed'), result.stdout);
  });
});

test('orphan dry-run: --dry-orphan 이면 파일이 남아있음', () => {
  withTmpDirs((src, dst) => {
    writeFile(dst, 'orphan.svg', 'ORPHAN');
    writeFile(src, 'real.png', 'REAL');

    const result = runSync(src, dst, ['--dry-orphan']);
    assert.equal(result.status, 0, result.stderr);
    // dry-orphan 이므로 파일은 삭제되지 않아야 함
    assert.ok(
      existsSync(join(dst, 'orphan.svg')),
      'dry-orphan이면 파일이 남아야 함',
    );
    assert.ok(result.stdout.includes('[dry-orphan]'), result.stdout);
    assert.ok(
      result.stdout.includes('dry-orphan: 실제 삭제 안 함'),
      result.stdout,
    );
  });
});

test('orphan: src가 빈 디렉토리면 dst 미디어 파일 전부 삭제', () => {
  withTmpDirs((src, dst) => {
    writeFile(dst, 'a/b/old.jpg', 'OLD');
    writeFile(dst, 'c/d/old.png', 'OLD');

    const result = runSync(src, dst);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!existsSync(join(dst, 'a/b/old.jpg')));
    assert.ok(!existsSync(join(dst, 'c/d/old.png')));
    assert.ok(result.stdout.includes('2 removed'), result.stdout);
  });
});
