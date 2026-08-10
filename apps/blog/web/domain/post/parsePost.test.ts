import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePost, extractPlainText, resolveExcerpt } from './repository';
import { isPostFile } from './visibility';

// ── 메타 파일 제외 (어떤 글을 가져올지) ───────────────────────────────────────

test('parsePost: frontmatter delimiter 없으면 null (메타 노트)', () => {
  assert.equal(parsePost('# 제목만 있는 노트\n본문', 'note.md'), null);
});

test('parsePost: status가 없으면 null (메타 파일)', () => {
  const raw = `---\ntitle: 메타\ndate: 2025-01-01\n---\n본문`;
  assert.equal(parsePost(raw, 'meta.md'), null);
});

test('parsePost: slug만 있고 status가 없으면 null', () => {
  // 예전 규칙(`!slug && !published && !status`)에서는 포스트로 잡혔지만,
  // 이제 판정 축은 status 하나입니다.
  const raw = `---\ntitle: 글\nslug: some-slug\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md'), null);
});

test('parsePost: 폐기된 published 필드만 있으면 null (status로만 판정)', () => {
  const raw = `---\ntitle: 옛 글\npublished: true\n---\n본문`;
  assert.equal(parsePost(raw, 'legacy.md'), null);
});

test('parsePost: status 값이 enum 밖이면 null', () => {
  const raw = `---\ntitle: 글\nstatus: publish\n---\n본문`;
  assert.equal(parsePost(raw, 'typo.md'), null);
});

// ── isPostFile: repository와 validate-posts가 공유하는 단일 판정 규칙 ─────────

test('isPostFile: 유효한 status가 있을 때만 true', () => {
  assert.equal(isPostFile({ status: 'published' }), true);
  assert.equal(isPostFile({ status: 'draft' }), true);
  assert.equal(isPostFile({ status: 'scheduled' }), true);
  assert.equal(isPostFile({ status: 'foo' }), false);
  assert.equal(isPostFile({ status: 3 }), false);
  assert.equal(isPostFile({}), false);
});

test('isPostFile: 폐기된 published나 slug는 판정에 관여하지 않는다', () => {
  const legacy: Record<string, unknown> = { published: true };
  const slugOnly: Record<string, unknown> = { slug: 'a' };
  assert.equal(isPostFile(legacy), false);
  assert.equal(isPostFile(slugOnly), false);
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

// ── hero (히어로 다이어그램 이름) ────────────────────────────────────────────

test('parsePost: hero는 문자열일 때만 보존', () => {
  const raw = `---\ntitle: 글\nstatus: published\nhero: deploy-pipeline\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.hero, 'deploy-pipeline');
});

test('parsePost: hero가 문자열이 아니면 undefined', () => {
  // YAML은 뭐든 줄 수 있다. 숫자/불리언/배열이 그대로 흘러가면 렌더 계층에서
  // getDiagram(number)가 되므로 여기서 잘라낸다.
  for (const value of ['123', 'true', '[a, b]', "''"]) {
    const raw = `---\ntitle: 글\nstatus: published\nhero: ${value}\n---\n본문`;
    assert.equal(parsePost(raw, 'a.md')?.hero, undefined, `hero: ${value}`);
  }
});

test('parsePost: hero 미지정이면 undefined (썸네일 폴백은 렌더 계층이 결정)', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.hero, undefined);
});

test('parsePost: 등록 여부는 도메인이 판정하지 않는다 (미등록 이름도 그대로 통과)', () => {
  // 도메인이 UI 컴포넌트 목록을 알면 의존 방향이 뒤집힌다. 오타는 lint:posts가 잡는다.
  const raw = `---\ntitle: 글\nstatus: published\nhero: 없는-다이어그램\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.hero, '없는-다이어그램');
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

test('parsePost: tags에 문자열 아닌 원소가 섞이면 통째로 undefined', () => {
  // 조용한 부분 유실을 막기 위해 전부-문자열일 때만 보존합니다.
  // (validate-posts의 invalid-tags 규칙이 별도로 에러를 냅니다)
  const raw = `---\ntitle: 글\nstatus: published\ntags: [a, 3]\n---\n본문`;
  assert.equal(parsePost(raw, 'a.md')?.tags, undefined);
});

test('parsePost: 빈 문자열 title/excerpt/thumbnail은 값 없음으로 취급', () => {
  const raw = `---\ntitle: ''\nstatus: published\nexcerpt: ''\nthumbnail: ''\n---\n본문입니다`;
  const post = parsePost(raw, 'my-file.md');
  assert.equal(post?.title, 'my-file'); // 파일명 폴백
  assert.equal(post?.excerpt, '본문입니다'); // 본문 폴백
  assert.equal(post?.thumbnail, undefined);
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

// 태그는 의미상 집합이다. 중복이 흘러가면 글 메타에 `#ci #ci`가 두 번 찍히고,
// getAllTags() 개수가 부풀고, 목록 렌더에서 React key가 충돌한다.
test('parsePost: 중복 태그는 하나로 합친다', () => {
  const post = parsePost(
    `---\nstatus: published\ntitle: T\ndate: '2026-01-01'\ntags: [ci, ci, build]\n---\n본문`,
    'a.md',
  );
  assert.deepEqual(post?.tags, ['ci', 'build']);
});

test('parsePost: 중복 태그는 첫 등장 순서를 지킨다', () => {
  const post = parsePost(
    `---\nstatus: published\ntitle: T\ndate: '2026-01-01'\ntags: [b, a, b]\n---\n본문`,
    'a.md',
  );
  assert.deepEqual(post?.tags, ['b', 'a']);
});

test('resolveExcerpt: 명시 excerpt가 있으면 그대로', () => {
  assert.equal(resolveExcerpt('본문', '요약'), '요약');
});

test('resolveExcerpt: 빈 문자열은 값 없음 — 본문 발췌로 폴백', () => {
  assert.equal(resolveExcerpt('본문입니다', ''), '본문입니다');
});

test('resolveExcerpt: 160자를 넘으면 자르고 말줄임', () => {
  const long = '가'.repeat(300);
  assert.equal(resolveExcerpt(long), '가'.repeat(160) + '...');
});

test('resolveExcerpt: 짧으면 말줄임을 붙이지 않는다', () => {
  // 잘리지도 않았는데 '...'이 붙으면 "뒤에 더 있다"는 잘못된 신호가 된다.
  assert.equal(resolveExcerpt('짧은 본문'), '짧은 본문');
});

test('resolveExcerpt: parsePost의 excerpt와 같은 결과 (규칙이 한 곳)', () => {
  // lint:posts의 duplicate-description이 원문에서 같은 값을 계산해야 한다.
  const body = '가'.repeat(300);
  const post = parsePost(
    `---\ntitle: x\nstatus: published\n---\n${body}`,
    'a.md',
  );
  assert.equal(post?.excerpt, resolveExcerpt(body));
});
