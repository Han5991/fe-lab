/**
 * sync-posts.ts 통합 테스트
 *
 * 임시 src/dst 디렉토리를 만들어 **실물 sync 함수**를 직접 실행하고
 * orphan 파일 삭제(및 dry-orphan 모드) 동작을 검증합니다.
 *
 * 예전에는 경로가 CONTENT_PATHS 싱글턴에 고정돼 주입할 손잡이가 없어서, 같은
 * 로직을 인라인 wrapper 문자열로 복제해 spawnSync로 돌렸다 — 복제본과 실물이
 * 갈라질 수 있는 구조였다. 지금은 syncFull/syncIncremental이 경로를 인자로
 * 받으므로 실물을 그대로 테스트한다.
 */
import { expect, test, vi } from 'vitest';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import {
  selectPublishedMedia,
  syncFull,
  syncIncremental,
} from './sync-posts.ts';

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

/** console.log 출력을 모아 반환 — 실물 함수가 찍는 요약 메시지를 검증한다. */
function captureLog(fn: () => void): string {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    fn();
    return spy.mock.calls.map(args => args.join(' ')).join('\n');
  } finally {
    spy.mockRestore();
  }
}

// ── tests ───────────────────────────────────────────────────────────────────

test('sync: src 파일이 dst로 복사됨', () => {
  withTmpDirs((src, dst) => {
    writeFile(src, 'a/img.png', 'PNG');

    const stdout = captureLog(() => syncIncremental(src, dst, false));
    expect(
      existsSync(join(dst, 'a/img.png')),
      'dst에 파일이 복사되어야 함',
    ).toBeTruthy();
    expect(stdout.includes('1 copied'), stdout).toBeTruthy();
  });
});

test('orphan 삭제: src에 없는 dst 파일이 삭제됨', () => {
  withTmpDirs((src, dst) => {
    // dst에 orphan 파일 미리 생성
    writeFile(dst, 'orphan.png', 'ORPHAN');
    // src에는 다른 파일
    writeFile(src, 'real.jpg', 'REAL');

    const stdout = captureLog(() => syncIncremental(src, dst, false));
    expect(
      !existsSync(join(dst, 'orphan.png')),
      'orphan 파일이 삭제되어야 함',
    ).toBeTruthy();
    expect(
      existsSync(join(dst, 'real.jpg')),
      'src 파일은 dst에 복사되어야 함',
    ).toBeTruthy();
    expect(stdout.includes('1 removed'), stdout).toBeTruthy();
  });
});

test('orphan dry-run: dry-orphan이면 파일이 남아있음', () => {
  withTmpDirs((src, dst) => {
    writeFile(dst, 'orphan.svg', 'ORPHAN');
    writeFile(src, 'real.png', 'REAL');

    const stdout = captureLog(() => syncIncremental(src, dst, true));
    // dry-orphan 이므로 파일은 삭제되지 않아야 함
    expect(
      existsSync(join(dst, 'orphan.svg')),
      'dry-orphan이면 파일이 남아야 함',
    ).toBeTruthy();
    expect(stdout.includes('[dry-orphan]'), stdout).toBeTruthy();
    expect(stdout.includes('dry-orphan: 실제 삭제 안 함'), stdout).toBeTruthy();
  });
});

test('orphan: src가 빈 디렉토리면 dst 미디어 파일 전부 삭제', () => {
  withTmpDirs((src, dst) => {
    writeFile(dst, 'a/b/old.jpg', 'OLD');
    writeFile(dst, 'c/d/old.png', 'OLD');

    const stdout = captureLog(() => syncIncremental(src, dst, false));
    expect(!existsSync(join(dst, 'a/b/old.jpg'))).toBeTruthy();
    expect(!existsSync(join(dst, 'c/d/old.png'))).toBeTruthy();
    expect(stdout.includes('2 removed'), stdout).toBeTruthy();
  });
});

test('syncFull: dst를 비우고 전체 복사 (미디어 아닌 파일도 제거됨)', () => {
  withTmpDirs((src, dst) => {
    writeFile(src, 'a/img.png', 'PNG');
    writeFile(dst, 'stale.txt', 'STALE');

    const stdout = captureLog(() => syncFull(src, dst));
    expect(existsSync(join(dst, 'a/img.png'))).toBeTruthy();
    expect(
      !existsSync(join(dst, 'stale.txt')),
      'full sync는 dst를 통째로 비운다',
    ).toBeTruthy();
    expect(stdout.includes('1 files copied'), stdout).toBeTruthy();
  });
});

test('incremental: 크기·mtime이 같으면 복사를 건너뜀', () => {
  withTmpDirs((src, dst) => {
    writeFile(src, 'img.png', 'PNG');
    captureLog(() => syncIncremental(src, dst, false));

    const second = captureLog(() => syncIncremental(src, dst, false));
    expect(second.includes('0 copied, 1 unchanged'), second).toBeTruthy();
  });
});

// ── 공개 글이 가리키는 미디어만 싣는다 ─────────────────────────────────────

function post(relativeDir: string, content: string, thumbnail?: string) {
  return { relativeDir, content, thumbnail };
}

test('selectPublishedMedia: 글 폴더 기준 상대 경로의 여러 표기를 모두 참조로 본다', () => {
  const media = [
    'feconf/img/a b.png',
    'feconf/img/start.png',
    'feconf/dot.png',
    'feconf/html.jpeg',
    'root.png',
    'feconf/abs.gif',
  ];
  const selected = selectPublishedMedia(
    [
      post(
        'feconf',
        [
          '![a](img/a%20b.png)',
          '![s](./img/start.png "제목")',
          '<img src="dot.png" alt="d" />',
          "<figure><img src='html.jpeg' alt='h'></figure>",
          '![r](../root.png)',
          '![abs](/posts/feconf/abs.gif)',
        ].join('\n'),
      ),
    ],
    media,
  );
  expect([...selected].sort()).toStrictEqual([...media].sort());
});

test('selectPublishedMedia: 참조되지 않은 파일·다른 파일의 꼬리는 싣지 않는다', () => {
  const selected = selectPublishedMedia(
    [post('feconf', '![s](img/start.png)')],
    ['feconf/img/start.png', 'feconf/start.png', 'feconf/unused.png'],
  );
  // `img/start.png` 안의 `start.png`는 같은 폴더의 다른 파일을 가리키지 않는다.
  expect([...selected]).toStrictEqual(['feconf/img/start.png']);
});

test.each([
  ['문장 끝 마침표', '원본은 img/a.png.'],
  ['닫는 대괄호', '[img/a.png]'],
  ['괄호 설명', 'img/a.png(원본)'],
  ['콜론·세미콜론·느낌표', 'img/a.png: 설명; img/a.png!'],
  ['표 셀', '| img/a.png |'],
])('selectPublishedMedia: 경로 뒤에 %s가 와도 참조로 본다', (_, text) => {
  const selected = selectPublishedMedia(
    [post('feconf', text)],
    ['feconf/img/a.png'],
  );
  expect([...selected]).toStrictEqual(['feconf/img/a.png']);
});

test('selectPublishedMedia: 경로가 더 긴 이름의 일부면 참조가 아니다', () => {
  const selected = selectPublishedMedia(
    [post('feconf', 'img/a.png2 old-img/a.png img/a.png_bak')],
    ['feconf/img/a.png'],
  );
  expect([...selected]).toStrictEqual([]);
});

test('selectPublishedMedia: frontmatter thumbnail도 참조다 (OG·JSON-LD가 원본을 쓴다)', () => {
  const selected = selectPublishedMedia(
    [post('ci', '본문에는 없음', 'cover-thumb.png'), post('', '', '/og/x.png')],
    ['ci/cover-thumb.png', 'og/x.png'],
  );
  expect([...selected]).toStrictEqual(['ci/cover-thumb.png']);
});

test('sync: include가 거른 파일은 복사하지 않고, 이전 사본은 orphan으로 지운다', () => {
  withTmpDirs((src, dst) => {
    writeFile(src, 'a/public.png', 'PUB');
    writeFile(src, 'a/draft.png', 'DRAFT');
    writeFile(dst, 'a/draft.png', 'DRAFT');

    const stdout = captureLog(() =>
      syncIncremental(src, dst, false, rel => rel === 'a/public.png'),
    );
    expect(existsSync(join(dst, 'a/public.png'))).toBeTruthy();
    expect(
      !existsSync(join(dst, 'a/draft.png')),
      '비공개 글의 이미지 사본은 지워져야 함',
    ).toBeTruthy();
    expect(stdout.includes('1 removed, 1 not published'), stdout).toBeTruthy();
  });
});

test('syncFull: include가 거른 파일은 복사하지 않는다', () => {
  withTmpDirs((src, dst) => {
    writeFile(src, 'public.png', 'PUB');
    writeFile(src, 'draft.png', 'DRAFT');

    captureLog(() => syncFull(src, dst, rel => rel === 'public.png'));
    expect(existsSync(join(dst, 'public.png'))).toBeTruthy();
    expect(!existsSync(join(dst, 'draft.png'))).toBeTruthy();
  });
});
