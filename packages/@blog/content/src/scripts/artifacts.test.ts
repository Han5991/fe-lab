import { expect, test } from 'vitest';
import { ARTIFACTS, type ArtifactSpec } from './artifacts.ts';
import { SITE_URL } from '../shared/constants.ts';

/**
 * 레지스트리 항목별 **URL 추출** 계약. 집합 대조 규칙(exact/subset/superset)은
 * check-seo.test.ts의 checkArtifacts 쪽이 잠근다.
 */

function spec(name: string): ArtifactSpec {
  const found = ARTIFACTS.find(a => a.name === name);
  if (!found) throw new Error(`레지스트리에 ${name} 항목이 없습니다`);
  return found;
}

/**
 * 판별 프로퍼티(kind)로 스펙을 좁힌다.
 *
 * `expect`는 node:assert/strict의 equal과 달리 TS assertion signature가 아니라
 * 단언만으로는 유니온이 좁혀지지 않는다. 좁히기는 이 헬퍼가, 값 검증은 헬퍼가
 * 던지는 에러가 맡는다 — 호출부에 non-null 단언(`!`)을 흘리지 않기 위해서다.
 */
function specOfKind<K extends ArtifactSpec['kind']>(
  name: string,
  kind: K,
): Extract<ArtifactSpec, { kind: K }> {
  const s = spec(name);
  if (s.kind !== kind) {
    throw new Error(
      `${name}의 kind는 '${kind}'여야 합니다 (실제: '${s.kind}')`,
    );
  }
  return s as Extract<ArtifactSpec, { kind: K }>;
}

function extractFile(name: string, text: string): Set<string> {
  return specOfKind(name, 'file').extractUrls(text);
}

// ── 레지스트리 자체 계약 ─────────────────────────────────────────────────────

test('레지스트리: 대조 기준(reference)은 정확히 하나 — sitemap.xml', () => {
  const refs = ARTIFACTS.filter(a => a.reference);
  expect(refs.length).toBe(1);
  expect(refs[0].name).toBe('sitemap.xml');
  // 기준은 발행 글 전체를 담아야 하므로 visible/exact여야 대조가 성립한다.
  expect(refs[0].postSet).toBe('visible');
  expect(refs[0].relation).toBe('exact');
});

test('레지스트리: exact가 아닌 행은 og(subset)·admin(superset) 둘뿐이다', () => {
  // og는 needsGeneratedOg 부분집합이라 exact로 조이면 게이트가 항상 실패하고,
  // 반대로 다른 행이 subset으로 풀리면 글 누락이 조용히 지나간다(fail-open).
  // 완화·강화 어느 방향의 오타도 여기서 걸리도록 두 행을 통째로 잠근다.
  const og = ARTIFACTS.find(a => a.kind === 'dir' && a.path === 'og');
  expect(og, '레지스트리에 og 디렉터리 항목이 없습니다').toBeTruthy();
  expect(og?.postSet).toBe('visible');
  expect(og?.relation).toBe('subset');
  const admin = spec('admin-posts-index.json');
  expect(admin.postSet).toBe('all');
  expect(admin.relation).toBe('superset');
  for (const a of ARTIFACTS) {
    if (a === og || a === admin) continue;
    expect(a.relation, `${a.name}의 relation이 exact가 아닙니다`).toBe('exact');
  }
});

test('레지스트리: 이름과 경로가 중복되지 않는다', () => {
  expect(new Set(ARTIFACTS.map(a => a.name)).size).toBe(ARTIFACTS.length);
  expect(new Set(ARTIFACTS.map(a => a.path)).size).toBe(ARTIFACTS.length);
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
    expect(
      names.has(required),
      `${required}가 레지스트리에 없습니다`,
    ).toBeTruthy();
  }
  expect(ARTIFACTS.some(a => a.kind === 'dir' && a.path === 'og')).toBeTruthy();
});

// ── 형식별 추출 ──────────────────────────────────────────────────────────────

test('sitemap 추출: 아카이브(/posts/)와 정적 URL은 글로 세지 않는다', () => {
  const xml = `<urlset><url><loc>${SITE_URL}/</loc></url><url><loc>${SITE_URL}/posts/</loc></url><url><loc>${SITE_URL}/about/</loc></url><url><loc>${SITE_URL}/posts/a/</loc></url></urlset>`;
  expect(extractFile('sitemap.xml', xml)).toStrictEqual(
    new Set([`${SITE_URL}/posts/a/`]),
  );
});

test('rss 추출: guid만 읽고 본문(content:encoded)의 링크·이미지는 세지 않는다', () => {
  const rss = `<item><guid isPermaLink="true">${SITE_URL}/posts/a/</guid></item><item><description><![CDATA[<a href="${SITE_URL}/posts/딴글/">링크</a><img src="${SITE_URL}/posts/시리즈/img/x.png"/>]]></description></item>`;
  expect(extractFile('rss.xml', rss)).toStrictEqual(
    new Set([`${SITE_URL}/posts/a/`]),
  );
});

test('llms.txt 추출: 마크다운 링크의 URL만 읽는다', () => {
  const text = `- [블로그 홈](${SITE_URL}/): 설명\n- [글](${SITE_URL}/posts/a/): 요약`;
  expect(extractFile('llms.txt', text)).toStrictEqual(
    new Set([`${SITE_URL}/posts/a/`]),
  );
});

test('llms-full.txt 추출: `### [제목](url) (날짜)` 헤딩 형식도 같은 패턴으로 읽는다', () => {
  // 별도 정규식이 필요 없다 — llms.txt와 같은 마크다운 링크 형식이다.
  const text = `### [글](${SITE_URL}/posts/a/) (2026-01-01)\n\n요약...\n`;
  expect(extractFile('llms-full.txt', text)).toStrictEqual(
    new Set([`${SITE_URL}/posts/a/`]),
  );
});

test('추출 정규화: 인코딩된 URL과 원문 URL이 같은 집합이 된다 (한글 slug 오탐 방지)', () => {
  const encoded = extractFile(
    'sitemap.xml',
    `<loc>${SITE_URL}/posts/${encodeURIComponent('한글')}/</loc>`,
  );
  const raw = extractFile('rss.xml', `<guid>${SITE_URL}/posts/한글/</guid>`);
  expect(encoded).toStrictEqual(raw);
});

test('JSON 인덱스 추출: slug 배열 → 페이지 링크와 같은 빌더의 URL 집합', () => {
  const json = JSON.stringify([{ slug: 'a' }, { slug: '한글/글' }]);
  expect(extractFile('search-index.json', json)).toStrictEqual(
    new Set([`${SITE_URL}/posts/a/`, `${SITE_URL}/posts/한글/글/`]),
  );
});

test('JSON 인덱스 추출: 깨진 JSON은 빈 집합 — 게이트는 실패하되 도구는 멈추지 않는다', () => {
  expect(extractFile('search-index.json', '{broken')).toStrictEqual(new Set());
  expect(extractFile('admin-posts-index.json', '"배열이 아님"')).toStrictEqual(
    new Set(),
  );
});

test('og 디렉터리 추출: png 경로 → 글 URL, 중첩 slug 보존, png 아닌 파일 무시', () => {
  const og = specOfKind('og 이미지 (og/*.png)', 'dir');
  expect(og.extractUrls(['a.png', '회고/2024.png', '.DS_Store'])).toStrictEqual(
    new Set([`${SITE_URL}/posts/a/`, `${SITE_URL}/posts/회고/2024/`]),
  );
});
