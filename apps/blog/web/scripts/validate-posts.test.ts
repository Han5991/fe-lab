import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validatePost,
  validateBodyHeadings,
  validateImageReferences,
  scanBodyLines,
  maskNonProse,
  detectDuplicateSlugs,
  type PostRecord,
} from './validate-posts';
import { DIAGRAM_NAMES } from '@/domain/post/diagramNames';

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

/**
 * 권장 길이(120~160자) 안에 드는 유효한 excerpt.
 * excerpt가 없으면 missing-excerpt 경고가 나므로, 다른 규칙을 보는 픽스처는
 * 이 값을 함께 넣어 "그 규칙만" 검사되게 한다.
 */
const VALID_EXCERPT = '가'.repeat(130);

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
    rules({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      excerpt: VALID_EXCERPT,
    }),
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

test('validatePost: status가 유효하지 않아도 나머지 검사를 계속한다', () => {
  // status 키가 있으면 meta-file-skipped 조기 반환을 타지 않는다. 빌드에서 제외될
  // 파일이라도 오타 하나 고칠 때마다 새 에러가 튀어나오지 않도록 한 번에 전부
  // 알려주기 위한 의도적 동작이라 테스트로 잠근다.
  const found = rules({ status: 'foo', tags: 'notarray' });
  assert.ok(found.includes('invalid-status'));
  assert.ok(found.includes('missing-title'));
  assert.ok(found.includes('invalid-tags'));
  assert.ok(!found.includes('meta-file-skipped'));
});

// ── date 필수 ────────────────────────────────────────────────────────────────
// date는 목록 정렬·아카이브·sitemap·RSS가 모두 읽고, scheduled의 공개 시각이기도
// 하다. 예전에는 없어도 조용히 통과했다.

test('validatePost: date 누락 → missing-date', () => {
  assert.ok(
    rules({ title: 'x', status: 'published' }).includes('missing-date'),
  );
  assert.ok(rules({ title: 'x', status: 'draft' }).includes('missing-date'));
});

test('validatePost: scheduled인데 date가 없으면 missing-date (영원히 비공개)', () => {
  // 예전 scheduled-without-date 규칙을 대체한다. date가 필수가 되면서
  // "scheduledDate도 date도 없음" 조건이 missing-date에 완전히 포섭됐다.
  const issues = validatePost(
    rec({ title: 'x', status: 'scheduled' }),
    '---\ntitle: x\n---\n',
  );
  const found = issues.filter(i => i.rule === 'missing-date');
  assert.equal(found.length, 1, 'missing-date가 정확히 하나여야 함(중복 없음)');
  assert.match(found[0].message, /영원히 비공개/);
  assert.ok(!issues.some(i => i.rule === 'scheduled-without-date'));
});

test('validatePost: scheduledDate만 있고 date가 없으면 missing-date', () => {
  // 공개 시각은 scheduledDate로 정해지지만 정렬·아카이브·표시는 여전히 date를 본다.
  assert.ok(
    rules({
      title: 'x',
      status: 'scheduled',
      scheduledDate: '2026-06-01T09:00:00+09:00',
    }).includes('missing-date'),
  );
});

test('validatePost: scheduled + date만 있으면 이슈 없음 (date 폴백)', () => {
  // scheduledDate는 시각까지 지정할 때만 쓰는 선택 필드.
  // visibility.ts가 date를 공개 시각으로 쓰므로 date만으로 충분하다.
  assert.deepEqual(
    rules({
      title: 'x',
      status: 'scheduled',
      date: '2026-06-01',
      excerpt: VALID_EXCERPT,
    }),
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
      date: '2026-06-01',
      scheduledDate: '2026-06-01T09:00:00+09:00',
      excerpt: VALID_EXCERPT,
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
    rules({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      thumbnail: '/abs.png',
      excerpt: VALID_EXCERPT,
    }),
    [],
  );
  assert.deepEqual(
    rules({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      thumbnail: 'https://cdn/x.png',
      excerpt: VALID_EXCERPT,
    }),
    [],
  );
});

// ── hero (히어로 다이어그램 이름) ────────────────────────────────────────────

test('validatePost: 등록된 hero 이름은 이슈 없음', () => {
  for (const name of DIAGRAM_NAMES) {
    assert.deepEqual(
      rules({
        title: 'x',
        status: 'published',
        date: '2025-01-01',
        hero: name,
        excerpt: VALID_EXCERPT,
      }),
      [],
      `등록된 이름인데 이슈 발생: ${name}`,
    );
  }
});

test('validatePost: 미등록 hero 이름 → unknown-hero-diagram 에러', () => {
  const issues = validatePost(
    rec({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      hero: 'deploy-pipelnie',
    }),
    "---\ntitle: x\nhero: 'deploy-pipelnie'\n---\n",
  );
  const found = issues.find(i => i.rule === 'unknown-hero-diagram');
  assert.ok(found, 'unknown-hero-diagram 이슈가 있어야 함');
  assert.equal(found.severity, 'error');
  assert.equal(found.line, 3);
});

test('validatePost: 문자열 아닌 hero도 unknown-hero-diagram', () => {
  assert.ok(
    rules({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      hero: 3,
    }).includes('unknown-hero-diagram'),
  );
});

test('validatePost: hero는 더 이상 unknown-frontmatter-key 경고를 내지 않는다', () => {
  const found = rules({
    title: 'x',
    status: 'published',
    date: '2025-01-01',
    hero: DIAGRAM_NAMES[0],
  });
  assert.ok(!found.includes('unknown-frontmatter-key'));
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

// 렌더 계층(repository.toStringArray)이 중복을 걷어내므로 화면은 멀쩡하지만,
// frontmatter에 남아 있으면 저자가 눈치채지 못한다. 에러가 아니라 경고인 이유다.
test('validatePost: 중복 태그 → duplicate-tags 경고', () => {
  const issues = validatePost(
    rec({ title: 'x', status: 'published', tags: ['ci', 'ci', 'build'] }),
    '---\ntitle: x\n---\n',
  );
  const dup = issues.find(i => i.rule === 'duplicate-tags');
  assert.ok(dup, 'duplicate-tags 이슈가 있어야 함');
  assert.equal(dup?.severity, 'warning');
  assert.ok(dup?.message.includes('ci'));
});

test('validatePost: 중복 없는 태그는 duplicate-tags를 내지 않는다', () => {
  assert.ok(
    !rules({ title: 'x', status: 'published', tags: ['ci', 'build'] }).includes(
      'duplicate-tags',
    ),
  );
});

// ── 본문 h1 (body-h1) ────────────────────────────────────────────────────────

/** 본문만 넘겨 body-h1 규칙을 돌린다 (frontmatter는 최소 형태로 고정) */
function bodyH1Rules(content: string, data: Record<string, unknown> = {}) {
  const raw = '---\ntitle: x\nstatus: published\n---\n';
  return validateBodyHeadings(
    rec({ title: 'x', status: 'published', ...data }, { content }),
    raw,
  );
}

test('validateBodyHeadings: 본문 h1 → body-h1 경고', () => {
  const issues = bodyH1Rules('# 제목\n\n본문');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].rule, 'body-h1');
  assert.equal(issues[0].severity, 'warning');
});

test('validateBodyHeadings: h2 이하는 잡지 않는다', () => {
  assert.deepEqual(bodyH1Rules('## 절\n\n### 소절\n\n#해시태그'), []);
});

test('validateBodyHeadings: 코드 펜스 안의 `# 주석`은 헤딩이 아니다', () => {
  // Dockerfile·yaml 예제의 주석이 h1로 잡히면 고칠 수 없는 경고만 쌓인다.
  assert.deepEqual(
    bodyH1Rules('```yaml\n# 워크플로우 주석\n on: push\n```\n\n본문'),
    [],
  );
});

test('validateBodyHeadings: 펜스가 닫힌 뒤의 h1은 다시 잡는다', () => {
  const issues = bodyH1Rules('```sh\n# 주석\n```\n\n# 진짜 헤딩');
  assert.equal(issues.length, 1);
  assert.ok(issues[0].message.includes('진짜 헤딩'));
});

test('validateBodyHeadings: 메타 노트(유효한 status 없음)는 검사하지 않는다', () => {
  // 빌드에서 통째로 제외되는 기획 문서라 렌더될 일이 없다.
  assert.deepEqual(
    validateBodyHeadings(
      rec({ title: '메타' }, { content: '# 제목' }),
      '---\ntitle: x\n---\n',
    ),
    [],
  );
});

test('validateBodyHeadings: line은 frontmatter 오프셋을 더한 실제 파일 줄번호', () => {
  const raw = '---\ntitle: x\nstatus: published\n---\n\n# 제목\n';
  const issues = validateBodyHeadings(
    rec({ title: 'x', status: 'published' }, { content: '\n# 제목\n' }),
    raw,
  );
  // frontmatter 4줄 + 본문 2번째 줄
  assert.equal(issues[0].line, 6);
});

// ── excerpt (meta description) ───────────────────────────────────────────────

test('validatePost: excerpt 누락 → missing-excerpt 경고', () => {
  assert.ok(
    rules({ title: 'x', status: 'published', date: '2025-01-01' }).includes(
      'missing-excerpt',
    ),
  );
});

test("validatePost: 빈 excerpt('')도 missing-excerpt — 자동 발췌로 폴백된다", () => {
  // repository.ts의 toOptionalString이 빈 문자열을 "값 없음"으로 떨어뜨린다.
  // new-post 스캐폴딩이 `excerpt: ''`를 깔아주므로 이걸 놓치면 새 글마다 재발한다.
  assert.ok(
    rules({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      excerpt: '',
    }).includes('missing-excerpt'),
  );
});

test('validatePost: 너무 짧거나 긴 excerpt → excerpt-length 경고', () => {
  const short = rules({
    title: 'x',
    status: 'published',
    date: '2025-01-01',
    excerpt: '짧음',
  });
  assert.ok(short.includes('excerpt-length'));
  assert.ok(
    !short.includes('missing-excerpt'),
    '빈 값이 아니면 missing이 아니다',
  );

  assert.ok(
    rules({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      excerpt: '가'.repeat(300),
    }).includes('excerpt-length'),
  );
});

// ── seoTitle (<title> 길이) ──────────────────────────────────────────────────

test('validatePost: title이 길면 long-title 경고', () => {
  assert.ok(
    rules({
      title: '가'.repeat(60),
      status: 'published',
      date: '2025-01-01',
      excerpt: VALID_EXCERPT,
    }).includes('long-title'),
  );
});

test('validatePost: seoTitle이 짧으면 title이 길어도 long-title이 아니다', () => {
  // <title>은 seoTitle로 조립되므로, 긴 title 자체는 문제가 아니다.
  assert.ok(
    !rules({
      title: '가'.repeat(60),
      seoTitle: '짧은 제목',
      status: 'published',
      date: '2025-01-01',
      excerpt: VALID_EXCERPT,
    }).includes('long-title'),
  );
});

test('validatePost: seoTitle 자체가 길면 long-title', () => {
  assert.ok(
    rules({
      title: '짧음',
      seoTitle: '가'.repeat(60),
      status: 'published',
      date: '2025-01-01',
      excerpt: VALID_EXCERPT,
    }).includes('long-title'),
  );
});

test('validatePost: 문자열 아닌 seoTitle → non-string-field', () => {
  assert.ok(
    rules({ title: 'x', status: 'published', seoTitle: 123 }).includes(
      'non-string-field',
    ),
  );
});

test('validatePost: seoTitle은 알려진 frontmatter 키다', () => {
  assert.ok(
    !rules({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      seoTitle: '짧은 제목',
      excerpt: VALID_EXCERPT,
    }).includes('unknown-frontmatter-key'),
  );
});

// ── scanBodyLines (코드 펜스 추적) ───────────────────────────────────────────

/** 펜스 밖으로 판정된 줄의 텍스트만 */
const outside = (content: string) =>
  scanBodyLines(content)
    .filter(l => !l.inFence)
    .map(l => l.text);

test('scanBodyLines: 펜스 안쪽은 inFence, 바깥은 본문', () => {
  assert.deepEqual(outside('앞\n```ts\ncode\n```\n뒤'), ['앞', '뒤']);
});

test('scanBodyLines: ```로 연 펜스는 ~~~로 닫히지 않는다', () => {
  // 마크다운을 다루는 글이 코드 예시로 ~~~를 품는 경우. 문자를 무시하고 개수만
  // 보면 여기서 펜스가 닫힌 것으로 오인해 뒤의 `# 주석`이 본문으로 새어 나온다.
  assert.deepEqual(outside('```md\n~~~\n# 주석\n```\n본문'), ['본문']);
});

test('scanBodyLines: ~~~로 연 펜스는 ```로 닫히지 않는다', () => {
  assert.deepEqual(outside('~~~md\n```\n# 주석\n~~~\n본문'), ['본문']);
});

test('scanBodyLines: 여는 펜스보다 짧은 펜스로는 닫히지 않는다', () => {
  assert.deepEqual(outside('````md\n```\n# 주석\n````\n본문'), ['본문']);
});

test('scanBodyLines: 라벨이 붙은 펜스는 닫는 펜스가 아니다', () => {
  assert.deepEqual(outside('```md\n```ts\n# 주석\n```\n본문'), ['본문']);
});

test('scanBodyLines: opensFence는 여는 줄에만, info string을 담는다', () => {
  const opens = scanBodyLines('```ts title="a.ts"\ncode\n```')
    .filter(l => l.opensFence !== null)
    .map(l => l.opensFence);
  assert.deepEqual(opens, ['ts title="a.ts"']);
});

test('validateBodyHeadings: ``` 안의 ~~~ 때문에 펜스가 새지 않는다', () => {
  // 고칠 수 없는 body-h1 경고가 나오던 회귀.
  assert.deepEqual(bodyH1Rules('```md\n~~~\n# 코드 예시 주석\n```\n'), []);
});

// ── strict 모드 (prebuild 전용) ───────────────────────────────────────────────

/** strict 모드에서 나온 에러의 rule 이름만 */
function strictErrors(data: Record<string, unknown>): string[] {
  return validatePost(rec(data), '---\ntitle: x\n---\n', { strict: true })
    .filter(i => i.severity === 'error')
    .map(i => i.rule);
}

test('strict: 발행 글의 excerpt 누락은 에러 (check-seo가 배포를 막기 전에 잡는다)', () => {
  assert.ok(
    strictErrors({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
    }).includes('missing-excerpt'),
  );
});

test('strict: scheduled도 에러 — 예약일이 지나면 발행되므로 cron 빌드가 터진다', () => {
  assert.ok(
    strictErrors({
      title: 'x',
      status: 'scheduled',
      date: '2026-12-01',
    }).includes('missing-excerpt'),
  );
});

test('strict: draft는 여전히 경고 — 빌드에서 빠지므로 check-seo가 볼 일이 없다', () => {
  assert.deepEqual(
    strictErrors({ title: 'x', status: 'draft', date: '2025-01-01' }),
    [],
  );
});

test('strict가 아니면 발행 글도 경고 — predev가 이 검사를 돌기 때문', () => {
  // 글을 쓰는 중에 status를 published로 두는 건 흔하다. 요약을 아직 안 적었다고
  // dev 서버가 안 뜨면 도구가 방해물이 된다.
  const issues = validatePost(
    rec({ title: 'x', status: 'published', date: '2025-01-01' }),
    '---\ntitle: x\n---\n',
  );
  assert.deepEqual(
    issues.filter(i => i.severity === 'error'),
    [],
  );
});

test('strict: long-title / excerpt-length도 발행 글에서는 에러', () => {
  const found = strictErrors({
    title: '가'.repeat(60),
    status: 'published',
    date: '2025-01-01',
    excerpt: '짧음',
  });
  assert.ok(found.includes('long-title'));
  assert.ok(found.includes('excerpt-length'));
});

test('strict: body-h1은 에러가 아니다 — 렌더가 h2로 강등해 배포를 막지 않는다', () => {
  const issues = validateBodyHeadings(
    rec({ title: 'x', status: 'published' }, { content: '# 제목' }),
    '---\ntitle: x\n---\n',
  );
  assert.deepEqual(
    issues.map(i => i.severity),
    ['warning'],
  );
});

test('strict: 이미지 alt 누락은 발행 글에서 에러, draft에서는 경고', () => {
  const raw = '---\ntitle: x\n---\n';
  const withAltMissing = (status: string) =>
    validateImageReferences(
      rec(
        { title: 'x', status, date: '2025-01-01' },
        // 외부 URL이라 파일 존재 검사(missing-image)는 타지 않는다.
        { content: '![](https://example.com/a.png)' },
      ),
      raw,
      { strict: true },
    ).filter(i => i.rule === 'missing-image-alt');

  assert.deepEqual(
    withAltMissing('published').map(i => i.severity),
    ['error'],
  );
  assert.deepEqual(
    withAltMissing('draft').map(i => i.severity),
    ['warning'],
  );
});

test('alt가 있으면 missing-image-alt를 내지 않는다', () => {
  assert.deepEqual(
    validateImageReferences(
      rec(
        { title: 'x', status: 'published' },
        { content: '![구조 다이어그램](https://example.com/a.png)' },
      ),
      '---\ntitle: x\n---\n',
      { strict: true },
    ),
    [],
  );
});

// ── 이미지 검사 범위 (펜스 · raw HTML · 메타 노트) ──────────────────────────

test('이미지: 코드 펜스 안의 `![](…)`는 코드 예시라 검사하지 않는다', () => {
  // 마크다운 사용법을 설명하는 글의 ```md 블록에서 고칠 수 없는 지적이 나오던 문제.
  assert.deepEqual(
    validateImageReferences(
      rec(
        { title: 'x', status: 'published' },
        { content: '```md\n![](https://example.com/a.png)\n```' },
      ),
      '---\ntitle: x\n---\n',
      { strict: true },
    ),
    [],
  );
});

test('이미지: raw HTML <img>의 alt 누락도 잡는다', () => {
  // check-seo는 최종 HTML의 모든 <img>를 세므로, 마크다운 문법만 검사하면
  // 로컬은 통과하고 CI에서만 실패한다 — strict 모드가 없애려던 그 간극이다.
  const found = validateImageReferences(
    rec(
      { title: 'x', status: 'published' },
      { content: '<img src="https://example.com/a.png">' },
    ),
    '---\ntitle: x\n---\n',
    { strict: true },
  );
  assert.deepEqual(
    found.map(i => i.rule),
    ['missing-image-alt'],
  );
  assert.equal(found[0].severity, 'error');
});

test('이미지: alt가 있는 raw HTML <img>는 통과 (작은따옴표 속성 포함)', () => {
  assert.deepEqual(
    validateImageReferences(
      rec(
        { title: 'x', status: 'published' },
        { content: "<img src='https://example.com/a.png' alt='구조도' />" },
      ),
      '---\ntitle: x\n---\n',
      { strict: true },
    ),
    [],
  );
});

test('이미지: 메타 노트(status 없음)는 alt를 검사하지 않는다', () => {
  // 빌드에서 통째로 빠지는 기획 문서라 렌더될 일이 없다.
  // validatePost·validateBodyHeadings와 같은 기준(isPostFile).
  assert.deepEqual(
    validateImageReferences(
      rec({ title: '메타' }, { content: '![](https://example.com/a.png)' }),
      '---\ntitle: x\n---\n',
      { strict: true },
    ),
    [],
  );
});

test('strict: status 없는 메타 노트는 발행 대상이 아니다 (에러로 올리지 않는다)', () => {
  // `status !== "draft"`로만 보면 status가 아예 없는 파일이 "발행 대상"으로
  // 오인돼 빌드를 막는다.
  const issues = validateImageReferences(
    rec({ title: '메타' }, { content: '![](./none.png)' }),
    '---\ntitle: x\n---\n',
    { strict: true },
  );
  assert.ok(!issues.some(i => i.rule === 'missing-image-alt'));
});

test('이미지: 한 줄에 이미지가 여럿이어도 각각 잡는다', () => {
  const found = validateImageReferences(
    rec(
      { title: 'x', status: 'published' },
      { content: '![](https://a.dev/1.png) 그리고 ![](https://a.dev/2.png)' },
    ),
    '---\ntitle: x\n---\n',
  );
  assert.equal(found.length, 2);
});

// ── maskNonProse (검사 제외 구간) ─────────────────────────────────────────────

test('maskNonProse: 길이를 유지한 채 덮는다 (줄 번호 계산이 어긋나지 않도록)', () => {
  const content = '앞\n```ts\ncode\n```\n뒤';
  const masked = maskNonProse(content);
  assert.equal(masked.length, content.length);
  assert.equal(masked.split('\n').length, content.split('\n').length);
});

test('maskNonProse: 인라인 코드도 덮는다', () => {
  assert.equal(maskNonProse('앞 `<img>` 뒤'), '앞         뒤');
});

test('이미지: 여러 줄에 걸친 raw <img>도 잡는다', () => {
  // <figure> 안에서 속성을 여러 줄로 늘어놓는 형태. 줄 단위로만 보면 통째로
  // 빠져나가 CI(check-seo)에서만 걸린다.
  const found = validateImageReferences(
    rec(
      { title: 'x', status: 'published' },
      {
        content:
          '<figure>\n  <img\n    src="https://a.dev/x.png"\n  />\n</figure>',
      },
    ),
    '---\ntitle: x\n---\n',
    { strict: true },
  );
  assert.deepEqual(
    found.map(i => i.rule),
    ['missing-image-alt'],
  );
});

test('이미지: 인라인 코드로 인용한 <img>는 검사하지 않는다', () => {
  // 태그를 문서에 인용한 것이지 이미지가 아니다. 엄격 모드에서 이건 고칠 수 없는
  // 에러가 되어 빌드를 막았다.
  assert.deepEqual(
    validateImageReferences(
      rec(
        { title: 'x', status: 'published' },
        { content: '`<img src="x">` 처럼 쓰면 됩니다.' },
      ),
      '---\ntitle: x\n---\n',
      { strict: true },
    ),
    [],
  );
});

test('이미지: 줄 번호는 실제 파일 줄을 가리킨다', () => {
  const found = validateImageReferences(
    rec(
      { title: 'x', status: 'published' },
      { content: '\n\n![](https://a.dev/x.png)' },
    ),
    '---\ntitle: x\nstatus: published\n---\n',
  );
  // frontmatter 4줄 + 본문 3번째 줄
  assert.equal(found[0].line, 7);
});

// ── setext h1 ────────────────────────────────────────────────────────────────

test('validateBodyHeadings: setext h1(`제목` + `===`)도 잡는다', () => {
  // ATX만 보면 setext h1은 조용히 h2로 강등되고 경고도 안 나와, 이 규칙이
  // 존재하는 이유(조용한 교정을 드러내기)가 무너진다.
  const issues = bodyH1Rules('제목입니다\n=====\n\n본문');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].rule, 'body-h1');
  assert.equal(issues[0].line, 5);
});

test('validateBodyHeadings: setext h2(`---`)는 h1이 아니므로 잡지 않는다', () => {
  assert.deepEqual(bodyH1Rules('절 제목\n-----\n\n본문'), []);
});

test('validateBodyHeadings: 코드 펜스 안의 `===`는 setext가 아니다', () => {
  assert.deepEqual(bodyH1Rules('```text\n제목\n===\n```\n'), []);
});

// ── truncated-excerpt ────────────────────────────────────────────────────────

test('validatePost: 말줄임으로 끝나는 excerpt → truncated-excerpt', () => {
  // check-seo는 최종 HTML만 보므로 자동 발췌가 샌 것과 구분하지 못하고 배포를
  // 막는다. 같은 조건을 여기서 먼저 잡아 로컬/CI 판정을 맞춘다.
  for (const suffix of ['...', '…']) {
    assert.ok(
      rules({
        title: 'x',
        status: 'published',
        date: '2025-01-01',
        excerpt: '가'.repeat(127) + suffix,
      }).includes('truncated-excerpt'),
      suffix,
    );
  }
});

test('validatePost: 정상적으로 끝나는 excerpt는 truncated-excerpt가 아니다', () => {
  assert.ok(
    !rules({
      title: 'x',
      status: 'published',
      date: '2025-01-01',
      excerpt: VALID_EXCERPT,
    }).includes('truncated-excerpt'),
  );
});
