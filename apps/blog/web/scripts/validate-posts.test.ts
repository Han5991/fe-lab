import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validatePost,
  detectDuplicateSlugs,
  type PostRecord,
} from './validate-posts';

function rec(
  data: Record<string, unknown>,
  over: Partial<PostRecord> = {},
): PostRecord {
  return {
    absPath: '/posts/a.md',
    relPath: 'a.md',
    data,
    content: '',
    ...over,
  };
}

/** validatePost가 낸 이슈의 rule 이름만 추출 (raw는 line 계산용) */
function rules(
  data: Record<string, unknown>,
  raw = '---\ntitle: x\n---\n',
): string[] {
  return validatePost(rec(data), raw).map(i => i.rule);
}

// ── validatePost: frontmatter 규칙 ───────────────────────────────────────────

test('validatePost: status 없으면 meta-file-skipped만', () => {
  assert.deepEqual(rules({ title: '메타' }), ['meta-file-skipped']);
});

test('validatePost: slug만 있고 status 없으면 meta-file-skipped (repository와 동일 판정)', () => {
  assert.deepEqual(rules({ title: '메타', slug: 'x' }), ['meta-file-skipped']);
});

// ── 폐기된 published 필드 ────────────────────────────────────────────────────

test('validatePost: published 필드가 남아 있으면 legacy-published-field 에러', () => {
  assert.ok(
    rules({ title: 'x', published: true }).includes('legacy-published-field'),
  );
  assert.ok(
    rules({ title: 'x', published: false }).includes('legacy-published-field'),
  );
});

test('validatePost: published만 있는 글을 meta-file-skipped로 조용히 넘기지 않는다', () => {
  // 예전 규칙에서는 포스트였던 글이 status 통일 후 빌드에서 통째로 사라지는데,
  // 경고(meta-file-skipped)로만 알리면 놓치기 쉽다. 반드시 에러여야 한다.
  const found = rules({ title: 'x', published: true });
  assert.ok(found.includes('legacy-published-field'));
  assert.ok(!found.includes('meta-file-skipped'));
});

test('validatePost: status와 published가 공존해도 에러 (published가 조용히 무시됨)', () => {
  assert.ok(
    rules({ title: 'x', status: 'draft', published: true }).includes(
      'legacy-published-field',
    ),
  );
});

test('validatePost: 정상 글은 이슈 없음', () => {
  assert.deepEqual(
    rules({ title: 'x', status: 'published', date: '2025-01-01' }),
    [],
  );
});

test('validatePost: title 누락 → missing-title', () => {
  assert.ok(rules({ status: 'published' }).includes('missing-title'));
});

test('validatePost: 잘못된 date → invalid-date', () => {
  assert.ok(
    rules({ title: 'x', status: 'published', date: 'not-a-date' }).includes(
      'invalid-date',
    ),
  );
});

test('validatePost: offset 없는 datetime date → ambiguous-date', () => {
  assert.ok(
    rules({
      title: 'x',
      status: 'published',
      date: '2026-06-01T09:00:00',
    }).includes('ambiguous-date'),
  );
});

test('validatePost: 잘못된 updatedAt → invalid-updated-at', () => {
  assert.ok(
    rules({
      title: 'x',
      status: 'published',
      updatedAt: 'not-a-date',
    }).includes('invalid-updated-at'),
  );
});

test('validatePost: offset 없는 datetime updatedAt → ambiguous-updated-at', () => {
  assert.ok(
    rules({
      title: 'x',
      status: 'published',
      updatedAt: '2026-06-01T09:00:00',
    }).includes('ambiguous-updated-at'),
  );
});

test('validatePost: 잘못된 status → invalid-status', () => {
  assert.ok(rules({ title: 'x', status: 'foo' }).includes('invalid-status'));
});

test('validatePost: scheduled인데 scheduledDate도 date도 없음 → scheduled-without-date', () => {
  assert.ok(
    rules({ title: 'x', status: 'scheduled' }).includes(
      'scheduled-without-date',
    ),
  );
});

test('validatePost: scheduled + date만 있으면 이슈 없음 (date 폴백)', () => {
  // scheduledDate는 시각까지 지정할 때만 쓰는 선택 필드.
  // visibility.ts가 date를 공개 시각으로 쓰므로 date만으로 충분하다.
  assert.deepEqual(
    rules({ title: 'x', status: 'scheduled', date: '2026-06-01' }),
    [],
  );
});

test('validatePost: 무따옴표 scheduledDate(YAML Date) → unquoted-scheduled-date', () => {
  // 무따옴표 datetime은 YAML이 Date로 파싱 → repository가 버림 → 공개 시각이
  // date(KST 자정)로 폴백 → 의도(09:00+09:00)보다 9시간 일찍 공개된다.
  assert.ok(
    rules({
      title: 'x',
      status: 'scheduled',
      date: '2026-06-01',
      scheduledDate: new Date('2026-06-01T09:00:00+09:00'),
    }).includes('unquoted-scheduled-date'),
  );
});

test('validatePost: 문자열 아닌 slug/excerpt/thumbnail → non-string-field', () => {
  // slug가 무시되면 파일 경로 기반 slug로 대체되어 URL이 조용히 바뀐다.
  assert.ok(
    rules({ title: 'x', status: 'published', slug: 123 }).includes(
      'non-string-field',
    ),
  );
  assert.ok(
    rules({ title: 'x', status: 'published', excerpt: 123 }).includes(
      'non-string-field',
    ),
  );
  assert.ok(
    rules({ title: 'x', status: 'published', thumbnail: 123 }).includes(
      'non-string-field',
    ),
  );
});

test('validatePost: scheduledDate가 잘못됨 → invalid-scheduled-date', () => {
  assert.ok(
    rules({ title: 'x', status: 'scheduled', scheduledDate: 'bad' }).includes(
      'invalid-scheduled-date',
    ),
  );
});

test('validatePost: scheduledDate offset 없음 → ambiguous-scheduled-date', () => {
  assert.ok(
    rules({
      title: 'x',
      status: 'scheduled',
      scheduledDate: '2026-06-01T09:00:00',
    }).includes('ambiguous-scheduled-date'),
  );
});

test('validatePost: scheduledDate offset 명시 → 이슈 없음', () => {
  assert.deepEqual(
    rules({
      title: 'x',
      status: 'scheduled',
      scheduledDate: '2026-06-01T09:00:00+09:00',
    }),
    [],
  );
});

test('validatePost: tags가 배열 아님 → invalid-tags', () => {
  assert.ok(
    rules({ title: 'x', status: 'published', tags: 'notarray' }).includes(
      'invalid-tags',
    ),
  );
});

test('validatePost: 알 수 없는 frontmatter 키 → unknown-frontmatter-key (경고)', () => {
  const issues = validatePost(
    rec({ title: 'x', status: 'published', tag: 'typo' }),
    '---\n---\n',
  );
  const unknown = issues.find(i => i.rule === 'unknown-frontmatter-key');
  assert.ok(unknown, 'unknown-frontmatter-key 이슈가 있어야 함');
  assert.equal(unknown.severity, 'warning');
});

test('validatePost: 절대/http thumbnail은 fs 검사 없이 통과', () => {
  assert.deepEqual(
    rules({ title: 'x', status: 'published', thumbnail: '/abs.png' }),
    [],
  );
  assert.deepEqual(
    rules({ title: 'x', status: 'published', thumbnail: 'https://cdn/x.png' }),
    [],
  );
});

// ── detectDuplicateSlugs ─────────────────────────────────────────────────────

test('detectDuplicateSlugs: 명시 slug 충돌 → 양쪽 duplicate-slug', () => {
  const records = [
    rec({ slug: 'dup' }, { relPath: 'a.md' }),
    rec({ slug: 'dup' }, { relPath: 'b.md' }),
  ];
  const issues = detectDuplicateSlugs(records);
  assert.equal(issues.length, 2);
  assert.ok(issues.every(i => i.rule === 'duplicate-slug'));
});

test('detectDuplicateSlugs: 명시 slug ↔ 파일명 기반 slug 충돌도 검출', () => {
  // 'b.md'의 기본 slug 'b' == 'a.md'의 명시 slug 'b'
  const records = [
    rec({ slug: 'b' }, { relPath: 'a.md' }),
    rec({}, { relPath: 'b.md' }),
  ];
  assert.equal(detectDuplicateSlugs(records).length, 2);
});

test('detectDuplicateSlugs: 충돌 없으면 빈 배열', () => {
  const records = [
    rec({ slug: 'a' }, { relPath: 'a.md' }),
    rec({ slug: 'b' }, { relPath: 'b.md' }),
  ];
  assert.deepEqual(detectDuplicateSlugs(records), []);
});
