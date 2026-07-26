import assert from 'node:assert/strict';
import { test } from 'node:test';
import matter from 'gray-matter';
import {
  parseArgs,
  todayKST,
  safeFilename,
  buildPostFilePath,
  buildFrontmatter,
} from './new-post';
import { validatePost, type PostRecord } from './validate-posts';

// ── parseArgs ────────────────────────────────────────────────────────────────

test('parseArgs: 위치 인자를 제목으로 쓰고 기본값은 draft/빈 tags', () => {
  const opts = parseArgs(['글 제목']);
  assert.equal(opts.title, '글 제목');
  assert.equal(opts.status, 'draft');
  assert.deepEqual(opts.tags, []);
  assert.equal(opts.series, undefined);
  assert.equal(opts.scheduledDate, undefined);
});

test('parseArgs: --key value / --key=value 두 형태 모두 지원', () => {
  assert.equal(parseArgs(['--title', '제목']).title, '제목');
  assert.equal(parseArgs(['--title=제목']).title, '제목');
  assert.equal(parseArgs(['--series=bundler']).series, 'bundler');
});

test('parseArgs: --title이 있으면 위치 인자보다 우선', () => {
  const opts = parseArgs(['무시될 제목', '--title', '진짜 제목']);
  assert.equal(opts.title, '진짜 제목');
});

test('parseArgs: -t/-s 축약 옵션', () => {
  const opts = parseArgs(['-t', '제목', '-s', 'bundler']);
  assert.equal(opts.title, '제목');
  assert.equal(opts.series, 'bundler');
});

test('parseArgs: --tags는 쉼표 분리 + trim + 빈 항목 제거', () => {
  const opts = parseArgs(['--tags', ' a , b ,, c,']);
  assert.deepEqual(opts.tags, ['a', 'b', 'c']);
});

test('parseArgs: --scheduled는 scheduledDate 설정과 함께 status를 scheduled로 강제', () => {
  const opts = parseArgs(['제목', '--scheduled', '2026-05-01T09:00:00+09:00']);
  assert.equal(opts.status, 'scheduled');
  assert.equal(opts.scheduledDate, '2026-05-01T09:00:00+09:00');
});

test('parseArgs: --scheduledDate alias도 동일하게 동작', () => {
  const opts = parseArgs(['--scheduledDate=2026-05-01']);
  assert.equal(opts.status, 'scheduled');
  assert.equal(opts.scheduledDate, '2026-05-01');
});

test('parseArgs: --status 유효값은 그대로 적용', () => {
  assert.equal(parseArgs(['--status', 'published']).status, 'published');
});

test('parseArgs: --status 잘못된 값은 에러', () => {
  assert.throws(
    () => parseArgs(['--status', 'live']),
    /draft\|published\|scheduled/,
  );
});

test('parseArgs: 알 수 없는 옵션은 에러 (--/- 모두)', () => {
  assert.throws(() => parseArgs(['--foo', 'x']), /알 수 없는 옵션: --foo/);
  assert.throws(() => parseArgs(['-x', 'y']), /알 수 없는 옵션: -x/);
});

// ── todayKST ─────────────────────────────────────────────────────────────────

test('todayKST: UTC 기준 전날 밤이어도 KST 날짜로 계산', () => {
  // UTC 1/31 16:00 == KST 2/1 01:00
  assert.equal(todayKST(new Date('2026-01-31T16:00:00Z')), '2026-02-01');
});

test('todayKST: KST 자정 직전이면 같은 날 유지', () => {
  // UTC 1/31 14:00 == KST 1/31 23:00
  assert.equal(todayKST(new Date('2026-01-31T14:00:00Z')), '2026-01-31');
});

// ── safeFilename ─────────────────────────────────────────────────────────────

test('safeFilename: 경로 구분자와 NUL을 -로 치환', () => {
  assert.equal(safeFilename('a/b\\c\0d'), 'a-b-c-d');
});

test('safeFilename: 앞뒤 공백 trim', () => {
  assert.equal(safeFilename('  제목  '), '제목');
});

// ── buildPostFilePath ────────────────────────────────────────────────────────

test('buildPostFilePath: 시리즈 없으면 postsDir 바로 아래에 생성', () => {
  assert.equal(buildPostFilePath('/posts', '제목'), '/posts/제목.md');
});

test('buildPostFilePath: 시리즈가 있으면 시리즈 폴더 아래에 생성', () => {
  assert.equal(
    buildPostFilePath('/posts', '번들러 3편', 'bundler'),
    '/posts/bundler/번들러 3편.md',
  );
});

test('buildPostFilePath: 제목 속 슬래시는 파일명에서 -로 치환', () => {
  assert.equal(buildPostFilePath('/posts', 'a/b'), '/posts/a-b.md');
});

test('buildPostFilePath: 공백뿐인 제목은 숨김 .md 파일이 되므로 에러', () => {
  assert.throws(() => buildPostFilePath('/posts', '   '), /제목이 비어/);
});

test('buildPostFilePath: 중첩 시리즈(회고/2024 스타일)는 허용', () => {
  assert.equal(
    buildPostFilePath('/posts', '글', '회고/2026'),
    '/posts/회고/2026/글.md',
  );
});

test('buildPostFilePath: 시리즈 세그먼트 앞뒤 공백은 trim', () => {
  assert.equal(
    buildPostFilePath('/posts', '글', ' bundler '),
    '/posts/bundler/글.md',
  );
});

test('buildPostFilePath: 상위 경로 탈출 시리즈는 에러', () => {
  assert.throws(
    () => buildPostFilePath('/posts', '글', '..'),
    /올바르지 않은 시리즈/,
  );
  assert.throws(
    () => buildPostFilePath('/posts', '글', '../etc'),
    /올바르지 않은 시리즈/,
  );
  assert.throws(
    () => buildPostFilePath('/posts', '글', 'a/../b'),
    /올바르지 않은 시리즈/,
  );
});

test('buildPostFilePath: 절대 경로/빈 세그먼트/특수문자 시리즈는 에러', () => {
  assert.throws(
    () => buildPostFilePath('/posts', '글', '/etc'),
    /올바르지 않은 시리즈/,
  );
  assert.throws(
    () => buildPostFilePath('/posts', '글', 'a//b'),
    /올바르지 않은 시리즈/,
  );
  assert.throws(
    () => buildPostFilePath('/posts', '글', 'a\\b'),
    /올바르지 않은 시리즈/,
  );
  assert.throws(
    () => buildPostFilePath('/posts', '글', '   '),
    /올바르지 않은 시리즈/,
  );
});

// ── buildFrontmatter ─────────────────────────────────────────────────────────

const NOW = new Date('2026-06-09T12:00:00+09:00');

test('buildFrontmatter: 기본 골격(frontmatter + h1 본문)', () => {
  const raw = buildFrontmatter(
    { title: '제목', status: 'draft', tags: ['a', 'b'] },
    NOW,
  );
  assert.equal(
    raw,
    [
      '---',
      "title: '제목'",
      'date: 2026-06-09',
      'status: draft',
      "excerpt: ''",
      "tags: ['a', 'b']",
      '---',
      '',
      '# 제목',
      '',
    ].join('\n'),
  );
});

test('buildFrontmatter: 시각까지 지정한 예약글은 scheduledDate를 추가하고 date는 공개 예정일', () => {
  const raw = buildFrontmatter(
    {
      title: '예약글',
      status: 'scheduled',
      tags: [],
      scheduledDate: '2026-05-01T09:00:00+09:00',
      slug: 'release-note',
    },
    NOW,
  );
  assert.match(raw, /scheduledDate: '2026-05-01T09:00:00\+09:00'/);
  assert.match(raw, /slug: 'release-note'/);
  // date는 스캐폴딩한 날(2026-06-09)이 아니라 공개 예정일이어야 한다.
  assert.match(raw, /date: 2026-05-01/);
});

test('buildFrontmatter: 날짜만 지정한 예약글은 scheduledDate 없이 date만', () => {
  // 'YYYY-MM-DD'는 date가 곧 KST 자정 공개 시각이라 scheduledDate가 중복이다.
  const raw = buildFrontmatter(
    { title: '예약글', status: 'scheduled', tags: [], scheduledDate: '2026-05-01' },
    NOW,
  );
  assert.match(raw, /date: 2026-05-01/);
  assert.ok(!raw.includes('scheduledDate'));
});

test('buildFrontmatter: 특수문자 slug도 YAML 구조를 깨지 않고 round-trip', () => {
  const slug = 'my: [edge] slug';
  const raw = buildFrontmatter(
    { title: '제목', status: 'draft', tags: [], slug },
    NOW,
  );
  assert.equal(matter(raw).data.slug, slug);
});

test('buildFrontmatter: 제목의 작은따옴표가 escape되어 round-trip 보존', () => {
  const title = "Don't Panic: 번들러 'core' 이야기";
  const raw = buildFrontmatter({ title, status: 'draft', tags: [] }, NOW);
  assert.equal(matter(raw).data.title, title);
});

test('buildFrontmatter: 특수문자 태그도 YAML 구조를 깨지 않고 round-trip', () => {
  // 인용 없이 직렬화하면 `tags: [foo: bar]`가 배열 속 맵으로 파싱되는 회귀 방지
  const tags = ['foo: bar', "don't", 'c++', '[edge]'];
  const raw = buildFrontmatter({ title: '제목', status: 'draft', tags }, NOW);
  assert.deepEqual(matter(raw).data.tags, tags);
});

// ── validate-posts 계약: 스캐폴드 결과물은 lint:posts를 통과해야 한다 ──────────

function recordOf(raw: string): PostRecord {
  const { data, content } = matter(raw);
  return { absPath: '/posts/a.md', relPath: 'a.md', data, content };
}

test('계약: draft 스캐폴드는 validatePost 이슈 0건', () => {
  const raw = buildFrontmatter(
    { title: '새 글', status: 'draft', tags: ['a'] },
    NOW,
  );
  assert.deepEqual(validatePost(recordOf(raw), raw), []);
});

test('계약: published 스캐폴드(slug 포함)는 validatePost 이슈 0건', () => {
  const raw = buildFrontmatter(
    { title: '새 글', status: 'published', tags: [], slug: 'new-post' },
    NOW,
  );
  assert.deepEqual(validatePost(recordOf(raw), raw), []);
});

test('계약: scheduled 스캐폴드(offset 포함 날짜)는 validatePost 이슈 0건', () => {
  const raw = buildFrontmatter(
    {
      title: '예약글',
      status: 'scheduled',
      tags: [],
      scheduledDate: '2026-12-01T09:00:00+09:00',
    },
    NOW,
  );
  assert.deepEqual(validatePost(recordOf(raw), raw), []);
});
