import { expect, test } from 'vitest';
import { parsePost, extractPlainText, resolveExcerpt } from './repository.ts';
import { isPostFile } from './visibility.ts';
import { testConfig } from './testing.ts';

// 발췌 길이는 설정에서 온다(기본값 없음) — 픽스처의 SEO 예산을 그대로 쓴다.
const MAX = testConfig.seo.descriptionMaxLength;
const PARSE_OPTS = { excerptMaxLength: MAX };

// ── 메타 파일 제외 (어떤 글을 가져올지) ───────────────────────────────────────

test('parsePost: frontmatter delimiter 없으면 null (메타 노트)', () => {
  expect(parsePost('# 제목만 있는 노트\n본문', 'note.md', PARSE_OPTS)).toBe(
    null,
  );
});

test('parsePost: status가 없으면 null (메타 파일)', () => {
  const raw = `---\ntitle: 메타\ndate: 2025-01-01\n---\n본문`;
  expect(parsePost(raw, 'meta.md', PARSE_OPTS)).toBe(null);
});

test('parsePost: slug만 있고 status가 없으면 null', () => {
  // 예전 규칙(`!slug && !published && !status`)에서는 포스트로 잡혔지만,
  // 이제 판정 축은 status 하나입니다.
  const raw = `---\ntitle: 글\nslug: some-slug\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)).toBe(null);
});

test('parsePost: 폐기된 published 필드만 있으면 null (status로만 판정)', () => {
  const raw = `---\ntitle: 옛 글\npublished: true\n---\n본문`;
  expect(parsePost(raw, 'legacy.md', PARSE_OPTS)).toBe(null);
});

test('parsePost: status 값이 enum 밖이면 null', () => {
  const raw = `---\ntitle: 글\nstatus: publish\n---\n본문`;
  expect(parsePost(raw, 'typo.md', PARSE_OPTS)).toBe(null);
});

// ── isPostFile: repository와 validate-posts가 공유하는 단일 판정 규칙 ─────────

test('isPostFile: 유효한 status가 있을 때만 true', () => {
  expect(isPostFile({ status: 'published' })).toBe(true);
  expect(isPostFile({ status: 'draft' })).toBe(true);
  expect(isPostFile({ status: 'scheduled' })).toBe(true);
  expect(isPostFile({ status: 'foo' })).toBe(false);
  expect(isPostFile({ status: 3 })).toBe(false);
  expect(isPostFile({})).toBe(false);
});

test('isPostFile: 폐기된 published나 slug는 판정에 관여하지 않는다', () => {
  const legacy: Record<string, unknown> = { published: true };
  const slugOnly: Record<string, unknown> = { slug: 'a' };
  expect(isPostFile(legacy)).toBe(false);
  expect(isPostFile(slugOnly)).toBe(false);
});

// ── slug / series 유도 (파일 경로 기반) ──────────────────────────────────────

test('parsePost: slug 미지정 시 파일명(rawSlug)으로 유도', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  const post = parsePost(raw, 'intro.md', PARSE_OPTS);
  expect(post?.slug).toBe('intro');
  expect(post?.originalSlug).toBe('intro');
  expect(post?.series).toBe(undefined);
  expect(post?.relativeDir).toBe('');
});

test('parsePost: 중첩 폴더는 series + rawSlug(경로 보존)로 유도', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  const post = parsePost(raw, '번들러/3편.md', PARSE_OPTS);
  expect(post?.slug).toBe('번들러/3편');
  expect(post?.series).toBe('번들러');
  expect(post?.relativeDir).toBe('번들러');
});

test('parsePost: 백슬래시(Windows) 경로도 분할', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  const post = parsePost(raw, '번들러\\3편.md', PARSE_OPTS);
  expect(post?.slug).toBe('번들러/3편');
  expect(post?.series).toBe('번들러');
});

test('parsePost: frontmatter slug가 rawSlug보다 우선(originalSlug는 경로 보존)', () => {
  const raw = `---\ntitle: 글\nslug: custom-slug\nstatus: published\n---\n본문`;
  const post = parsePost(raw, '번들러/3편.md', PARSE_OPTS);
  expect(post?.slug).toBe('custom-slug'); // 표시 slug = frontmatter 우선
  expect(post?.originalSlug).toBe('번들러/3편'); // 파일 경로는 보존
});

// ── title fallback ──────────────────────────────────────────────────────────

test('parsePost: title 미지정 시 파일명으로 fallback', () => {
  const raw = `---\nstatus: published\n---\n본문`;
  expect(parsePost(raw, 'my-file-name.md', PARSE_OPTS)?.title).toBe(
    'my-file-name',
  );
});

// ── publish 설정(status) ─────────────────────────────────────────────────────

test('parsePost: status 필드를 그대로 반영', () => {
  for (const s of ['published', 'draft', 'scheduled'] as const) {
    const raw = `---\ntitle: 글\nstatus: ${s}\n---\n본문`;
    expect(parsePost(raw, 'a.md', PARSE_OPTS)?.status).toBe(s);
  }
});

test('parsePost: scheduledDate는 문자열일 때만 보존', () => {
  const raw = `---\ntitle: 글\nstatus: scheduled\nscheduledDate: '2026-03-01T09:00:00+09:00'\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.scheduledDate).toBe(
    '2026-03-01T09:00:00+09:00',
  );
});

// ── date 정규화 ──────────────────────────────────────────────────────────────

test('parsePost: YAML Date 객체(date: 2025-01-02)를 YYYY-MM-DD로 정규화', () => {
  const raw = `---\ntitle: 글\nstatus: published\ndate: 2025-01-02\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.date).toBe('2025-01-02');
});

test("parsePost: 따옴표 문자열 date('2025-01-02')는 그대로 보존", () => {
  const raw = `---\ntitle: 글\nstatus: published\ndate: '2025-01-02'\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.date).toBe('2025-01-02');
});

test('parsePost: date 없으면 null', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.date).toBe(null);
});

// ── excerpt / tags / thumbnail ───────────────────────────────────────────────

test('parsePost: excerpt 미지정 + 본문 160자 초과 → 160자 + "..."', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n${'가'.repeat(200)}`;
  const post = parsePost(raw, 'a.md', PARSE_OPTS);
  expect(post?.excerpt?.endsWith('...')).toBeTruthy();
  expect(post?.excerpt?.length).toBe(163); // 160 + '...'
});

test('parsePost: excerpt 미지정 + 본문 160자 이하 → "..." 없이 그대로', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n짧은 본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.excerpt).toBe('짧은 본문');
});

test('parsePost: excerpt 지정 시 그대로', () => {
  const raw = `---\ntitle: 글\nstatus: published\nexcerpt: 요약문\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.excerpt).toBe('요약문');
});

test('parsePost: tags는 배열일 때만 보존, 아니면 undefined', () => {
  const arr = `---\ntitle: 글\nstatus: published\ntags: [a, b]\n---\n본문`;
  expect(parsePost(arr, 'a.md', PARSE_OPTS)?.tags).toStrictEqual(['a', 'b']);
  const notArr = `---\ntitle: 글\nstatus: published\ntags: hello\n---\n본문`;
  expect(parsePost(notArr, 'a.md', PARSE_OPTS)?.tags).toBe(undefined);
});

test('parsePost: thumbnail은 문자열일 때만 보존', () => {
  const raw = `---\ntitle: 글\nstatus: published\nthumbnail: cover.png\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.thumbnail).toBe('cover.png');
});

// ── hero (히어로 다이어그램 이름) ────────────────────────────────────────────

test('parsePost: hero는 문자열일 때만 보존', () => {
  const raw = `---\ntitle: 글\nstatus: published\nhero: deploy-pipeline\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.hero).toBe('deploy-pipeline');
});

test('parsePost: hero가 문자열이 아니면 undefined', () => {
  // YAML은 뭐든 줄 수 있다. 숫자/불리언/배열이 그대로 흘러가면 렌더 계층에서
  // getDiagram(number)가 되므로 여기서 잘라낸다.
  for (const value of ['123', 'true', '[a, b]', "''"]) {
    const raw = `---\ntitle: 글\nstatus: published\nhero: ${value}\n---\n본문`;
    expect(parsePost(raw, 'a.md', PARSE_OPTS)?.hero, `hero: ${value}`).toBe(
      undefined,
    );
  }
});

test('parsePost: hero 미지정이면 undefined (썸네일 폴백은 렌더 계층이 결정)', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.hero).toBe(undefined);
});

test('parsePost: 등록 여부는 도메인이 판정하지 않는다 (미등록 이름도 그대로 통과)', () => {
  // 도메인이 UI 컴포넌트 목록을 알면 의존 방향이 뒤집힌다. 오타는 lint:posts가 잡는다.
  const raw = `---\ntitle: 글\nstatus: published\nhero: 없는-다이어그램\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.hero).toBe('없는-다이어그램');
});

test('parsePost: readMin >= 1', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n${'단어 '.repeat(300)}`;
  expect((parsePost(raw, 'a.md', PARSE_OPTS)?.readMin ?? 0) >= 1).toBeTruthy();
});

// ── 추가 엣지 (코드리뷰 반영) ─────────────────────────────────────────────────

test('parsePost: 빈 문자열 slug는 falsy라 rawSlug로 폴백', () => {
  const raw = `---\ntitle: 글\nslug: ''\nstatus: published\n---\n본문`;
  const post = parsePost(raw, '번들러/3편.md', PARSE_OPTS);
  expect(post?.slug).toBe('번들러/3편'); // '' || rawSlug → rawSlug
});

test('parsePost: updatedAt도 date와 동일하게 정규화(YAML Date → YYYY-MM-DD)', () => {
  const raw = `---\ntitle: 글\nstatus: published\nupdatedAt: 2025-05-05\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.updatedAt).toBe('2025-05-05');
});

test('parsePost: updatedAt 없으면 null', () => {
  const raw = `---\ntitle: 글\nstatus: published\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.updatedAt).toBe(null);
});

test('parsePost: scheduledDate가 문자열이 아니면(YAML Date) undefined로 거부', () => {
  // 무따옴표 datetime은 YAML이 Date 객체로 파싱 → 문자열 아님 → undefined.
  const raw = `---\ntitle: 글\nstatus: scheduled\nscheduledDate: 2026-03-01\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.scheduledDate).toBe(undefined);
});

test('parsePost: 시간/offset 포함 date(Date 객체)는 toISOString UTC 기준으로 정규화(현재 동작 잠금)', () => {
  // KST 오전(08:00+09:00)은 UTC로 전날 23:00 → toISOString().split('T')[0]가 하루 당겨짐.
  // toDateString이 UTC 기준이라 생기는 알려진 엣지(실 frontmatter는 'YYYY-MM-DD'만 사용).
  const raw = `---\ntitle: 글\nstatus: published\ndate: 2025-01-02T08:00:00+09:00\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.date).toBe('2025-01-01');
});

test('parsePost: tags에 문자열 아닌 원소가 섞이면 통째로 undefined', () => {
  // 조용한 부분 유실을 막기 위해 전부-문자열일 때만 보존합니다.
  // (validate-posts의 invalid-tags 규칙이 별도로 에러를 냅니다)
  const raw = `---\ntitle: 글\nstatus: published\ntags: [a, 3]\n---\n본문`;
  expect(parsePost(raw, 'a.md', PARSE_OPTS)?.tags).toBe(undefined);
});

test('parsePost: 빈 문자열 title/excerpt/thumbnail은 값 없음으로 취급', () => {
  const raw = `---\ntitle: ''\nstatus: published\nexcerpt: ''\nthumbnail: ''\n---\n본문입니다`;
  const post = parsePost(raw, 'my-file.md', PARSE_OPTS);
  expect(post?.title).toBe('my-file'); // 파일명 폴백
  expect(post?.excerpt).toBe('본문입니다'); // 본문 폴백
  expect(post?.thumbnail).toBe(undefined);
});

// ── extractPlainText 직접 ────────────────────────────────────────────────────

test('extractPlainText: 이미지/링크/마크다운 기호 제거', () => {
  expect(extractPlainText('![alt](img.png) 텍스트')).toBe('텍스트');
  expect(extractPlainText('[링크텍스트](http://x)')).toBe('링크텍스트');
  expect(extractPlainText('# 제목 **굵게**')).toBe('제목 굵게');
});

test('extractPlainText: 개행/연속공백 압축 + trim', () => {
  expect(extractPlainText('a\n\n\nb   c  ')).toBe('a b c');
});

// 태그는 의미상 집합이다. 중복이 흘러가면 글 메타에 `#ci #ci`가 두 번 찍히고,
// getAllTags() 개수가 부풀고, 목록 렌더에서 React key가 충돌한다.
test('parsePost: 중복 태그는 하나로 합친다', () => {
  const post = parsePost(
    `---\nstatus: published\ntitle: T\ndate: '2026-01-01'\ntags: [ci, ci, build]\n---\n본문`,
    'a.md',
    PARSE_OPTS,
  );
  expect(post?.tags).toStrictEqual(['ci', 'build']);
});

test('parsePost: 중복 태그는 첫 등장 순서를 지킨다', () => {
  const post = parsePost(
    `---\nstatus: published\ntitle: T\ndate: '2026-01-01'\ntags: [b, a, b]\n---\n본문`,
    'a.md',
    PARSE_OPTS,
  );
  expect(post?.tags).toStrictEqual(['b', 'a']);
});

test('resolveExcerpt: 명시 excerpt가 있으면 그대로', () => {
  expect(resolveExcerpt('본문', '요약', MAX)).toBe('요약');
});

test('resolveExcerpt: 빈 문자열은 값 없음 — 본문 발췌로 폴백', () => {
  expect(resolveExcerpt('본문입니다', '', MAX)).toBe('본문입니다');
});

test('resolveExcerpt: 예산을 넘으면 자르고 말줄임', () => {
  const long = '가'.repeat(300);
  expect(resolveExcerpt(long, undefined, MAX)).toBe('가'.repeat(MAX) + '...');
});

test('resolveExcerpt: 짧으면 말줄임을 붙이지 않는다', () => {
  // 잘리지도 않았는데 '...'이 붙으면 "뒤에 더 있다"는 잘못된 신호가 된다.
  expect(resolveExcerpt('짧은 본문', undefined, MAX)).toBe('짧은 본문');
});

test('resolveExcerpt: parsePost의 excerpt와 같은 결과 (규칙이 한 곳)', () => {
  // lint:posts의 duplicate-description이 원문에서 같은 값을 계산해야 한다.
  const body = '가'.repeat(300);
  const post = parsePost(
    `---\ntitle: x\nstatus: published\n---\n${body}`,
    'a.md',
    PARSE_OPTS,
  );
  expect(post?.excerpt).toBe(resolveExcerpt(body, undefined, MAX));
});
