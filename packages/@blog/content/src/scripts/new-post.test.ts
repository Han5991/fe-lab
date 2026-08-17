import { expect, test } from 'vitest';
import matter from 'gray-matter';
import {
  parseArgs,
  todayKST,
  safeFilename,
  buildPostFilePath,
  buildFrontmatter,
} from './new-post';
import {
  validatePost,
  validateBodyHeadings,
  type PostRecord,
} from './validate-posts';

// ── parseArgs ────────────────────────────────────────────────────────────────

test('parseArgs: 위치 인자를 제목으로 쓰고 기본값은 draft/빈 tags', () => {
  const opts = parseArgs(['글 제목']);
  expect(opts.title).toBe('글 제목');
  expect(opts.status).toBe('draft');
  expect(opts.tags).toStrictEqual([]);
  expect(opts.series).toBe(undefined);
  expect(opts.scheduledDate).toBe(undefined);
});

test('parseArgs: --key value / --key=value 두 형태 모두 지원', () => {
  expect(parseArgs(['--title', '제목']).title).toBe('제목');
  expect(parseArgs(['--title=제목']).title).toBe('제목');
  expect(parseArgs(['--series=bundler']).series).toBe('bundler');
});

test('parseArgs: --title이 있으면 위치 인자보다 우선', () => {
  const opts = parseArgs(['무시될 제목', '--title', '진짜 제목']);
  expect(opts.title).toBe('진짜 제목');
});

test('parseArgs: -t/-s 축약 옵션', () => {
  const opts = parseArgs(['-t', '제목', '-s', 'bundler']);
  expect(opts.title).toBe('제목');
  expect(opts.series).toBe('bundler');
});

test('parseArgs: --tags는 쉼표 분리 + trim + 빈 항목 제거', () => {
  const opts = parseArgs(['--tags', ' a , b ,, c,']);
  expect(opts.tags).toStrictEqual(['a', 'b', 'c']);
});

test('parseArgs: --scheduled는 scheduledDate 설정과 함께 status를 scheduled로 강제', () => {
  const opts = parseArgs(['제목', '--scheduled', '2026-05-01T09:00:00+09:00']);
  expect(opts.status).toBe('scheduled');
  expect(opts.scheduledDate).toBe('2026-05-01T09:00:00+09:00');
});

test('parseArgs: --scheduledDate alias도 동일하게 동작', () => {
  const opts = parseArgs(['--scheduledDate=2026-05-01']);
  expect(opts.status).toBe('scheduled');
  expect(opts.scheduledDate).toBe('2026-05-01');
});

test('parseArgs: --status 유효값은 그대로 적용', () => {
  expect(parseArgs(['--status', 'published']).status).toBe('published');
});

test('parseArgs: --status 잘못된 값은 에러', () => {
  expect(() => parseArgs(['--status', 'live'])).toThrow(
    /draft\|published\|scheduled/,
  );
});

test('parseArgs: 알 수 없는 옵션은 에러 (--/- 모두)', () => {
  expect(() => parseArgs(['--foo', 'x'])).toThrow(/알 수 없는 옵션: --foo/);
  expect(() => parseArgs(['-x', 'y'])).toThrow(/알 수 없는 옵션: -x/);
});

// ── todayKST ─────────────────────────────────────────────────────────────────

test('todayKST: UTC 기준 전날 밤이어도 KST 날짜로 계산', () => {
  // UTC 1/31 16:00 == KST 2/1 01:00
  expect(todayKST(new Date('2026-01-31T16:00:00Z'))).toBe('2026-02-01');
});

test('todayKST: KST 자정 직전이면 같은 날 유지', () => {
  // UTC 1/31 14:00 == KST 1/31 23:00
  expect(todayKST(new Date('2026-01-31T14:00:00Z'))).toBe('2026-01-31');
});

// ── safeFilename ─────────────────────────────────────────────────────────────

test('safeFilename: 경로 구분자와 NUL을 -로 치환', () => {
  expect(safeFilename('a/b\\c\0d')).toBe('a-b-c-d');
});

test('safeFilename: 앞뒤 공백 trim', () => {
  expect(safeFilename('  제목  ')).toBe('제목');
});

// ── buildPostFilePath ────────────────────────────────────────────────────────

test('buildPostFilePath: 시리즈 없으면 postsDir 바로 아래에 생성', () => {
  expect(buildPostFilePath('/posts', '제목')).toBe('/posts/제목.md');
});

test('buildPostFilePath: 시리즈가 있으면 시리즈 폴더 아래에 생성', () => {
  expect(buildPostFilePath('/posts', '번들러 3편', 'bundler')).toBe(
    '/posts/bundler/번들러 3편.md',
  );
});

test('buildPostFilePath: 제목 속 슬래시는 파일명에서 -로 치환', () => {
  expect(buildPostFilePath('/posts', 'a/b')).toBe('/posts/a-b.md');
});

test('buildPostFilePath: 공백뿐인 제목은 숨김 .md 파일이 되므로 에러', () => {
  expect(() => buildPostFilePath('/posts', '   ')).toThrow(/제목이 비어/);
});

test('buildPostFilePath: 중첩 시리즈(회고/2024 스타일)는 허용', () => {
  expect(buildPostFilePath('/posts', '글', '회고/2026')).toBe(
    '/posts/회고/2026/글.md',
  );
});

test('buildPostFilePath: 시리즈 세그먼트 앞뒤 공백은 trim', () => {
  expect(buildPostFilePath('/posts', '글', ' bundler ')).toBe(
    '/posts/bundler/글.md',
  );
});

test('buildPostFilePath: 상위 경로 탈출 시리즈는 에러', () => {
  expect(() => buildPostFilePath('/posts', '글', '..')).toThrow(
    /올바르지 않은 시리즈/,
  );
  expect(() => buildPostFilePath('/posts', '글', '../etc')).toThrow(
    /올바르지 않은 시리즈/,
  );
  expect(() => buildPostFilePath('/posts', '글', 'a/../b')).toThrow(
    /올바르지 않은 시리즈/,
  );
});

test('buildPostFilePath: 절대 경로/빈 세그먼트/특수문자 시리즈는 에러', () => {
  expect(() => buildPostFilePath('/posts', '글', '/etc')).toThrow(
    /올바르지 않은 시리즈/,
  );
  expect(() => buildPostFilePath('/posts', '글', 'a//b')).toThrow(
    /올바르지 않은 시리즈/,
  );
  expect(() => buildPostFilePath('/posts', '글', 'a\\b')).toThrow(
    /올바르지 않은 시리즈/,
  );
  expect(() => buildPostFilePath('/posts', '글', '   ')).toThrow(
    /올바르지 않은 시리즈/,
  );
});

// ── buildFrontmatter ─────────────────────────────────────────────────────────

const NOW = new Date('2026-06-09T12:00:00+09:00');

test('buildFrontmatter: 기본 골격 — 본문은 `## `로 시작한다 (h1을 깔지 않는다)', () => {
  const raw = buildFrontmatter(
    { title: '제목', status: 'draft', tags: ['a', 'b'] },
    NOW,
  );
  expect(raw).toBe(
    [
      '---',
      "title: '제목'",
      'date: 2026-06-09',
      'status: draft',
      "excerpt: ''",
      "tags: ['a', 'b']",
      '---',
      '',
      // 페이지의 h1은 PostHeader의 글 제목 하나뿐이어야 한다. 여기서 `# 제목`을
      // 깔아주는 바람에 예전 글들이 h1을 두 개씩 갖게 됐다.
      '## 들어가며',
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
  expect(raw).toMatch(/scheduledDate: '2026-05-01T09:00:00\+09:00'/);
  expect(raw).toMatch(/slug: 'release-note'/);
  // date는 스캐폴딩한 날(2026-06-09)이 아니라 공개 예정일이어야 한다.
  expect(raw).toMatch(/date: 2026-05-01/);
});

test('buildFrontmatter: 날짜만 지정한 예약글은 scheduledDate 없이 date만', () => {
  // 'YYYY-MM-DD'는 date가 곧 KST 자정 공개 시각이라 scheduledDate가 중복이다.
  const raw = buildFrontmatter(
    {
      title: '예약글',
      status: 'scheduled',
      tags: [],
      scheduledDate: '2026-05-01',
    },
    NOW,
  );
  expect(raw).toMatch(/date: 2026-05-01/);
  expect(!raw.includes('scheduledDate')).toBeTruthy();
});

test('buildFrontmatter: 특수문자 slug도 YAML 구조를 깨지 않고 round-trip', () => {
  const slug = 'my: [edge] slug';
  const raw = buildFrontmatter(
    { title: '제목', status: 'draft', tags: [], slug },
    NOW,
  );
  expect(matter(raw).data.slug).toBe(slug);
});

test('buildFrontmatter: 제목의 작은따옴표가 escape되어 round-trip 보존', () => {
  const title = "Don't Panic: 번들러 'core' 이야기";
  const raw = buildFrontmatter({ title, status: 'draft', tags: [] }, NOW);
  expect(matter(raw).data.title).toBe(title);
});

test('buildFrontmatter: 특수문자 태그도 YAML 구조를 깨지 않고 round-trip', () => {
  // 인용 없이 직렬화하면 `tags: [foo: bar]`가 배열 속 맵으로 파싱되는 회귀 방지
  const tags = ['foo: bar', "don't", 'c++', '[edge]'];
  const raw = buildFrontmatter({ title: '제목', status: 'draft', tags }, NOW);
  expect(matter(raw).data.tags).toStrictEqual(tags);
});

// ── validate-posts 계약: 스캐폴드 결과물은 lint:posts를 통과해야 한다 ──────────

function recordOf(raw: string): PostRecord {
  const { data, content } = matter(raw);
  return { absPath: '/posts/a.md', relPath: 'a.md', data, content };
}

/**
 * 스캐폴드는 기본(비엄격) 검사에서 **에러를 내면 안 된다** — predev가 이 검사를
 * 돌기 때문에, 에러가 나면 글을 시작하자마자 dev 서버가 안 뜬다.
 * 다만 경고는 하나 남는다: 비어 있는 `excerpt`를 채우라는 알림이다. 스캐폴딩이
 * 요약까지 지어낼 수는 없으니, 글을 쓰고 나서 채우라는 신호로 남긴다.
 */
function scaffoldIssues(raw: string) {
  const issues = validatePost(recordOf(raw), raw);
  expect(
    issues.filter(i => i.severity === 'error'),
    '스캐폴드가 에러를 내면 글을 시작하자마자 dev 서버가 막힌다',
  ).toStrictEqual([]);
  return issues.map(i => i.rule);
}

test('계약: draft 스캐폴드는 에러 없음 (excerpt 알림만)', () => {
  const raw = buildFrontmatter(
    { title: '새 글', status: 'draft', tags: ['a'] },
    NOW,
  );
  expect(scaffoldIssues(raw)).toStrictEqual(['missing-excerpt']);
});

test('계약: published 스캐폴드(slug 포함)는 에러 없음', () => {
  const raw = buildFrontmatter(
    { title: '새 글', status: 'published', tags: [], slug: 'new-post' },
    NOW,
  );
  expect(scaffoldIssues(raw)).toStrictEqual(['missing-excerpt']);
});

test('계약: scheduled 스캐폴드(offset 포함 날짜)는 에러 없음', () => {
  const raw = buildFrontmatter(
    {
      title: '예약글',
      status: 'scheduled',
      tags: [],
      scheduledDate: '2026-12-01T09:00:00+09:00',
    },
    NOW,
  );
  expect(scaffoldIssues(raw)).toStrictEqual(['missing-excerpt']);
});

test('계약: strict(prebuild)에서는 발행 상태 스캐폴드가 에러 — 빌드 전에 막는다', () => {
  // excerpt를 안 채운 채 published로 빌드하면 자동 발췌가 description으로 나가고
  // check-seo가 배포를 막는다. 그 실패를 CI가 아니라 빌드 직전에 당겨 온다.
  const raw = buildFrontmatter(
    { title: '새 글', status: 'published', tags: [] },
    NOW,
  );
  const errors = validatePost(recordOf(raw), raw, { strict: true }).filter(
    i => i.severity === 'error',
  );
  expect(errors.map(i => i.rule)).toStrictEqual(['missing-excerpt']);
});

test('계약: strict여도 draft 스캐폴드는 에러가 아니다 (쓰는 중엔 막지 않는다)', () => {
  const raw = buildFrontmatter(
    { title: '새 글', status: 'draft', tags: [] },
    NOW,
  );
  expect(
    validatePost(recordOf(raw), raw, { strict: true }).filter(
      i => i.severity === 'error',
    ),
  ).toStrictEqual([]);
});

test('계약: 스캐폴드 본문에는 h1이 없다 (body-h1 경고가 나지 않는다)', () => {
  // 페이지의 h1은 PostHeader의 글 제목 하나뿐이어야 한다. 스캐폴딩이 `# 제목`을
  // 깔아주던 탓에 예전 글 22편이 h1을 두 개씩 갖고 있었다.
  const raw = buildFrontmatter(
    { title: '새 글', status: 'draft', tags: [] },
    NOW,
  );
  const { data, content } = matter(raw);
  expect(
    validateBodyHeadings(
      { absPath: '/posts/a.md', relPath: 'a.md', data, content },
      raw,
    ),
  ).toStrictEqual([]);
});
