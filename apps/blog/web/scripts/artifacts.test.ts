import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARTIFACTS, type ArtifactSpec } from './artifacts';
import { SITE_URL } from '../lib/shared/constants';

/**
 * 레지스트리 항목별 **URL 추출** 계약. 집합 대조 규칙(exact/subset/superset)은
 * check-seo.test.ts의 checkArtifacts 쪽이 잠근다.
 */

function spec(name: string): ArtifactSpec {
  const found = ARTIFACTS.find(a => a.name === name);
  assert.ok(found, `레지스트리에 ${name} 항목이 없습니다`);
  return found;
}

function extractFile(name: string, text: string): Set<string> {
  const s = spec(name);
  // node:assert/strict의 equal은 strictEqual의 별칭이라 narrowing assertion이다
  // — 판별 프로퍼티가 좁혀지며 s가 file 스펙으로 좁아진다.
  assert.equal(s.kind, 'file');
  return s.extractUrls(text);
}

// ── 레지스트리 자체 계약 ─────────────────────────────────────────────────────

test('레지스트리: 대조 기준(reference)은 정확히 하나 — sitemap.xml', () => {
  const refs = ARTIFACTS.filter(a => a.reference);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].name, 'sitemap.xml');
  // 기준은 발행 글 전체를 담아야 하므로 visible/exact여야 대조가 성립한다.
  assert.equal(refs[0].postSet, 'visible');
  assert.equal(refs[0].relation, 'exact');
});

test('레지스트리: exact가 아닌 행은 og(subset)·admin(superset) 둘뿐이다', () => {
  // og는 needsGeneratedOg 부분집합이라 exact로 조이면 게이트가 항상 실패하고,
  // 반대로 다른 행이 subset으로 풀리면 글 누락이 조용히 지나간다(fail-open).
  // 완화·강화 어느 방향의 오타도 여기서 걸리도록 두 행을 통째로 잠근다.
  const og = ARTIFACTS.find(a => a.kind === 'dir' && a.path === 'og');
  assert.ok(og, '레지스트리에 og 디렉터리 항목이 없습니다');
  assert.equal(og.postSet, 'visible');
  assert.equal(og.relation, 'subset');
  const admin = spec('admin-posts-index.json');
  assert.equal(admin.postSet, 'all');
  assert.equal(admin.relation, 'superset');
  for (const a of ARTIFACTS) {
    if (a === og || a === admin) continue;
    assert.equal(
      a.relation,
      'exact',
      `${a.name}의 relation이 exact가 아닙니다`,
    );
  }
});

test('레지스트리: 이름과 경로가 중복되지 않는다', () => {
  assert.equal(new Set(ARTIFACTS.map(a => a.name)).size, ARTIFACTS.length);
  assert.equal(new Set(ARTIFACTS.map(a => a.path)).size, ARTIFACTS.length);
});

test('레지스트리: checkFeeds 시절 검사 밖이었던 산출물들이 모두 들어 있다', () => {
  // llms-full.txt의 인코딩 누락(contract/url PR이 수정)은 게이트가 없어서
  // 조용히 지나갔다 — 이 목록이 줄어들면 그 사각지대가 되돌아온다.
  const names = new Set(ARTIFACTS.map(a => a.name));
  for (const required of [
    'sitemap.xml',
    'rss.xml',
    'llms.txt',
    'llms-full.txt',
    'search-index.json',
    'admin-posts-index.json',
  ]) {
    assert.ok(names.has(required), `${required}가 레지스트리에 없습니다`);
  }
  assert.ok(ARTIFACTS.some(a => a.kind === 'dir' && a.path === 'og'));
});

// ── 형식별 추출 ──────────────────────────────────────────────────────────────

test('sitemap 추출: 아카이브(/posts/)와 정적 URL은 글로 세지 않는다', () => {
  const xml = `<urlset><url><loc>${SITE_URL}/</loc></url><url><loc>${SITE_URL}/posts/</loc></url><url><loc>${SITE_URL}/about/</loc></url><url><loc>${SITE_URL}/posts/a/</loc></url></urlset>`;
  assert.deepEqual(
    extractFile('sitemap.xml', xml),
    new Set([`${SITE_URL}/posts/a/`]),
  );
});

test('rss 추출: guid만 읽고 본문(content:encoded)의 링크·이미지는 세지 않는다', () => {
  const rss = `<item><guid isPermaLink="true">${SITE_URL}/posts/a/</guid></item><item><description><![CDATA[<a href="${SITE_URL}/posts/딴글/">링크</a><img src="${SITE_URL}/posts/시리즈/img/x.png"/>]]></description></item>`;
  assert.deepEqual(
    extractFile('rss.xml', rss),
    new Set([`${SITE_URL}/posts/a/`]),
  );
});

test('llms.txt 추출: 마크다운 링크의 URL만 읽는다', () => {
  const text = `- [블로그 홈](${SITE_URL}/): 설명\n- [글](${SITE_URL}/posts/a/): 요약`;
  assert.deepEqual(
    extractFile('llms.txt', text),
    new Set([`${SITE_URL}/posts/a/`]),
  );
});

test('llms-full.txt 추출: `### [제목](url) (날짜)` 헤딩 형식도 같은 패턴으로 읽는다', () => {
  // 별도 정규식이 필요 없다 — llms.txt와 같은 마크다운 링크 형식이다.
  const text = `### [글](${SITE_URL}/posts/a/) (2026-01-01)\n\n요약...\n`;
  assert.deepEqual(
    extractFile('llms-full.txt', text),
    new Set([`${SITE_URL}/posts/a/`]),
  );
});

test('추출 정규화: 인코딩된 URL과 원문 URL이 같은 집합이 된다 (한글 slug 오탐 방지)', () => {
  const encoded = extractFile(
    'sitemap.xml',
    `<loc>${SITE_URL}/posts/${encodeURIComponent('한글')}/</loc>`,
  );
  const raw = extractFile('rss.xml', `<guid>${SITE_URL}/posts/한글/</guid>`);
  assert.deepEqual(encoded, raw);
});

test('JSON 인덱스 추출: slug 배열 → 페이지 링크와 같은 빌더의 URL 집합', () => {
  const json = JSON.stringify([{ slug: 'a' }, { slug: '한글/글' }]);
  assert.deepEqual(
    extractFile('search-index.json', json),
    new Set([`${SITE_URL}/posts/a/`, `${SITE_URL}/posts/한글/글/`]),
  );
});

test('JSON 인덱스 추출: 깨진 JSON은 빈 집합 — 게이트는 실패하되 도구는 멈추지 않는다', () => {
  assert.deepEqual(extractFile('search-index.json', '{broken'), new Set());
  assert.deepEqual(
    extractFile('admin-posts-index.json', '"배열이 아님"'),
    new Set(),
  );
});

test('og 디렉터리 추출: png 경로 → 글 URL, 중첩 slug 보존, png 아닌 파일 무시', () => {
  const og = spec('og 이미지 (og/*.png)');
  assert.equal(og.kind, 'dir');
  const extract = og.extractUrls;
  assert.deepEqual(
    extract(['a.png', '회고/2024.png', '.DS_Store']),
    new Set([`${SITE_URL}/posts/a/`, `${SITE_URL}/posts/회고/2024/`]),
  );
});
