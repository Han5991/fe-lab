import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePost, determineStatus, extractPlainText } from './repository';

// ── 메타 파일 제외 (어떤 글을 가져올지) ───────────────────────────────────────

test('parsePost: frontmatter delimiter 없으면 null (메타 노트)', () => {
  assert.equal(parsePost('# 제목만 있는 노트\n본문', 'note.md'), null);
});

test('parsePost: slug/published/status 가시성 필드가 하나도 없으면 null (메타 파일)', () => {
  const raw = `---\ntitle: 메타\ndate: 2025-01-01\n---\n본문`;
  assert.equal(parsePost(raw, 'meta.md'), null);
});

test('parsePost: published: false만 있고 slug/status 없으면 null (현재 동작 잠금)', () => {
  // published:false는 falsy라 가시성 게이트(`!slug && !published && !status`)를 통과 → 제외.
  const raw = `---\ntitle: 숨김\npublished: false\n---\n본문`;
  assert.equal(parsePost(raw, 'hidden.md'), null);
});

// ── slug / series 유도 (파일 경로 기반) ──────────────────────────────────────

test('parsePost: slug 미지정 시 파일명(rawSlug)으로 유도', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  const post = parsePost(raw, 'intro.md');
  assert.equal(post?.slug, 'intro');
  assert.equal(post?.originalSlug, 'intro');
  assert.equal(post?.series, undefined);
  assert.equal(post?.relativeDir, '');
});

test('parsePost: 중첩 폴더는 series + rawSlug(경로 보존)로 유도', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  const post = parsePost(raw, '번들러/3편.md');
  assert.equal(post?.slug, '번들러/3편');
  assert.equal(post?.series, '번들러');
  assert.equal(post?.relativeDir, '번들러');
});

test('parsePost: 백슬래시(Windows) 경로도 분할', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  const post = parsePost(raw, '번들러\\3편.md');
  assert.equal(post?.slug, '번들러/3편');
  assert.equal(post?.series, '번들러');
});

test('parsePost: frontmatter slug가 rawSlug보다 우선(originalSlug는 경로 보존)', () => {
  const raw = `---\ntitle: 글\nslug: custom-slug\nstatus: published\n---\n본문`;
  const post = parsePost(raw, '번들러/3편.md');
  assert.equal(post?.slug, 'custom-slug'); // 표시 slug = frontmatter 우선
  assert.equal(post?.originalSlug, '번들러/3편'); // 파일 경로는 보존
});

// ── title fallback ──────────────────────────────────────────────────────────

test('parsePost: title 미지정 시 파일명으로 fallback', () => {
  const raw = `---\nstatus: published\n---\n본문`;
  assert.equal(parsePost(raw, 'my-file-name.md')?.title, 'my-file-name');
});

// ── publish 설정(status) ─────────────────────────────────────────────────────

test('parsePost: status 필드를 그대로 반영', () => {
  for (const s of ['published', 'draft', 'scheduled'] as const) {
    const raw = `---\ntitle: 글\nstatus: ${s}\n---\n본문`;
    assert.equal(parsePost(raw, 'a.md')?.status, s);
  }
});

test('parsePost: scheduledDate는 문자열일 때만 보존', () => {
  const raw = `---\ntitle: 글\nstatus: scheduled\nscheduledDate: '2026-03-01T09:00:00+09:00'\n---\n본문`;
  assert.equal(
    parsePost(raw, 'a.md')?.scheduledDate,
    '2026-03-01T09:00:00+09:00',
  );
});

// ── date 정규화 ──────────────────────────────────────────────────────────────

test('parsePost: YAML Date 객체(date: 2025-01-02)를 YYYY-MM-DD로 정규화', () => {
  const raw = `---\ntitle: 글\nstatus: published\ndate: 2025-01-02\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.date, '2025-01-02');
});

test("parsePost: 따옴표 문자열 date('2025-01-02')는 그대로 보존", () => {
  const raw = `---\ntitle: 글\nstatus: published\ndate: '2025-01-02'\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.date, '2025-01-02');
});

test('parsePost: date 없으면 null', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.date, null);
});

// ── excerpt / tags / thumbnail ───────────────────────────────────────────────

test('parsePost: excerpt 미지정 + 본문 160자 초과 → 160자 + "..."', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n${'가'.repeat(200)}`;
  const post = parsePost(raw, 'a.md');
  assert.ok(post?.excerpt?.endsWith('...'));
  assert.equal(post?.excerpt?.length, 163); // 160 + '...'
});

test('parsePost: excerpt 미지정 + 본문 160자 이하 → "..." 없이 그대로', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n짧은 본문`;
  assert.equal(parsePost(raw, 'a.md')?.excerpt, '짧은 본문');
});

test('parsePost: excerpt 지정 시 그대로', () => {
  const raw = `---\ntitle: 글\nstatus: published\nexcerpt: 요약문\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.excerpt, '요약문');
});

test('parsePost: tags는 배열일 때만 보존, 아니면 undefined', () => {
  const arr = `---\ntitle: 글\nstatus: published\ntags: [a, b]\n---\n본문`;
  assert.deepEqual(parsePost(arr, 'a.md')?.tags, ['a', 'b']);
  const notArr = `---\ntitle: 글\nstatus: published\ntags: hello\n---\n본문`;
  assert.equal(parsePost(notArr, 'a.md')?.tags, undefined);
});

test('parsePost: thumbnail은 문자열일 때만 보존', () => {
  const raw = `---\ntitle: 글\nstatus: published\nthumbnail: cover.png\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.thumbnail, 'cover.png');
});

test('parsePost: readMin >= 1', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n${'단어 '.repeat(300)}`;
  assert.ok((parsePost(raw, 'a.md')?.readMin ?? 0) >= 1);
});

// ── 추가 엣지 (코드리뷰 반영) ─────────────────────────────────────────────────

test('parsePost: 빈 문자열 slug는 falsy라 rawSlug로 폴백', () => {
  const raw = `---\ntitle: 글\nslug: ''\nstatus: published\n---\n본문`;
  const post = parsePost(raw, '번들러/3편.md');
  assert.equal(post?.slug, '번들러/3편'); // '' || rawSlug → rawSlug
});

test('parsePost: updatedAt도 date와 동일하게 정규화(YAML Date → YYYY-MM-DD)', () => {
  const raw = `---\ntitle: 글\nstatus: published\nupdatedAt: 2025-05-05\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.updatedAt, '2025-05-05');
});

test('parsePost: updatedAt 없으면 null', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.updatedAt, null);
});

test('parsePost: scheduledDate가 문자열이 아니면(YAML Date) undefined로 거부', () => {
  // 무따옴표 datetime은 YAML이 Date 객체로 파싱 → 문자열 아님 → undefined.
  const raw = `---\ntitle: 글\nstatus: scheduled\nscheduledDate: 2026-03-01\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.scheduledDate, undefined);
});

test('parsePost: 시간/offset 포함 date(Date 객체)는 toISOString UTC 기준으로 정규화(현재 동작 잠금)', () => {
  // KST 오전(08:00+09:00)은 UTC로 전날 23:00 → toISOString().split('T')[0]가 하루 당겨짐.
  // toDateString이 UTC 기준이라 생기는 알려진 엣지(실 frontmatter는 'YYYY-MM-DD'만 사용).
  const raw = `---\ntitle: 글\nstatus: published\ndate: 2025-01-02T08:00:00+09:00\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.date, '2025-01-01');
});

// ── determineStatus 직접 ─────────────────────────────────────────────────────

test('determineStatus: 유효 status 필드 우선', () => {
  assert.equal(determineStatus({ status: 'scheduled' }), 'scheduled');
});

test('determineStatus: status 없고 published:true면 published', () => {
  assert.equal(determineStatus({ published: true }), 'published');
});

test('determineStatus: status 없고 published 누락/false면 draft', () => {
  assert.equal(determineStatus({}), 'draft');
  assert.equal(determineStatus({ published: false }), 'draft');
});

test('determineStatus: 잘못된 status 문자열은 무시하고 published 폴백', () => {
  assert.equal(
    determineStatus({ status: 'foo', published: true }),
    'published',
  );
});

// ── extractPlainText 직접 ────────────────────────────────────────────────────

test('extractPlainText: 이미지/링크/마크다운 기호 제거', () => {
  assert.equal(extractPlainText('![alt](img.png) 텍스트'), '텍스트');
  assert.equal(extractPlainText('[링크텍스트](http://x)'), '링크텍스트');
  assert.equal(extractPlainText('# 제목 **굵게**'), '제목 굵게');
});

test('extractPlainText: 개행/연속공백 압축 + trim', () => {
  assert.equal(extractPlainText('a\n\n\nb   c  '), 'a b c');
});
