import { expect, test } from 'vitest';
import {
  buildSitemapXml,
  getPostPriority,
  HIGH_PRIORITY_FOLDERS,
  HIGH_PRIORITY_SLUGS,
} from './generate-sitemap';
import type { SitemapPost } from './generate-sitemap';
import { parseScheduledDateKST, getKSTDateISO } from '../shared/dates';
import { ABOUT_PAGE_MODIFIED } from '../shared/constants';

// arbitrary fixture date — not today's date. 단위 테스트는 실제 날짜에 의존하지
// 않고 이 값이 sitemap 본문에 그대로 흘러가는지만 검증합니다. (실제 날짜 동작은
// contract.test.ts의 TODAY = new Date().toISOString() 가 검증합니다.)
const TODAY = '2026-05-16';
const SITE = 'https://example.dev';

function makePost(over: Partial<SitemapPost> = {}): SitemapPost {
  return {
    slug: 'hello-world',
    date: '2026-05-09',
    updatedAt: null,
    // 루트 글은 빈 문자열이다(`repository.ts`의 currentPath) — optional이 아니다.
    relativeDir: '',
    ...over,
  };
}

test('sitemap: 정적 URL 3개(루트/posts/about)가 포함됨', () => {
  const xml = buildSitemapXml([], TODAY, SITE);
  expect(xml.includes(`<loc>${SITE}/</loc>`)).toBeTruthy();
  expect(xml.includes(`<loc>${SITE}/posts/</loc>`)).toBeTruthy();
  expect(xml.includes(`<loc>${SITE}/about/</loc>`)).toBeTruthy();
});

test('sitemap: 포스트 entry 개수만큼 <url> 블록 추가', () => {
  // 정적 URL 개수는 빈 posts 결과로부터 동적으로 산출 — 새 정적 페이지가
  // 추가될 때 이 테스트가 그 사실만으로 깨지지 않도록.
  const staticCount = (buildSitemapXml([], TODAY, SITE).match(/<url>/g) || [])
    .length;
  const posts = [
    makePost({ slug: 'a' }),
    makePost({ slug: 'b' }),
    makePost({ slug: 'c' }),
  ];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  const count = (xml.match(/<url>/g) || []).length;
  expect(count).toBe(staticCount + posts.length);
});

test('sitemap: slug의 특수문자가 URL 인코딩됨 (디렉토리 구분자는 보존)', () => {
  const posts = [makePost({ slug: 'series/한글 slug' })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  expect(xml.includes('/posts/series/')).toBeTruthy();
  expect(xml.includes(encodeURIComponent('한글 slug'))).toBeTruthy();
  // 디렉토리 구분자는 보존되어 인코딩되지 않음
  expect(!xml.includes(encodeURIComponent('series/'))).toBeTruthy();
});

test('sitemap: updatedAt 있으면 lastmod = updatedAt YYYY-MM-DD', () => {
  const posts = [
    makePost({
      slug: 'a',
      date: '2025-01-01',
      updatedAt: '2026-03-10',
    }),
  ];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  expect(xml.includes('<lastmod>2026-03-10</lastmod>')).toBeTruthy();
});

test('sitemap: updatedAt 없으면 lastmod = date', () => {
  const posts = [makePost({ slug: 'a', date: '2025-12-31' })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  expect(xml.includes('<lastmod>2025-12-31</lastmod>')).toBeTruthy();
});

test('sitemap: date도 updatedAt도 없으면 lastmod = today', () => {
  const posts = [makePost({ slug: 'a', date: null, updatedAt: null })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  // 정적 URL의 lastmod도 today지만, 포스트의 lastmod도 today여야 함
  expect(xml.includes(`<loc>${SITE}/posts/a/</loc>`)).toBeTruthy();
  // 같은 URL 블록 내에 today가 들어가는지
  const block = xml.match(
    /<url>\s*<loc>https:\/\/example\.dev\/posts\/a\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/,
  );
  expect(block, 'post url block must exist').toBeTruthy();
  expect(block?.[1]).toBe(TODAY);
});

// --- lastmod 신뢰성 회귀 테스트 ---
// 매일 cron으로 빌드되는 사이트라, 정적 URL의 lastmod에 빌드 날짜를 넣으면
// 콘텐츠가 그대로인 날에도 lastmod가 전진한다. Google은 그런 사이트의 lastmod를
// 통째로 무시하므로, 정적 URL은 콘텐츠에서 파생된 날짜만 써야 한다.

function staticBlock(xml: string, loc: string) {
  return xml.match(
    new RegExp(
      `<url>\\s*<loc>${loc.replace(/[/.]/g, '\\$&')}</loc>([\\s\\S]*?)</url>`,
    ),
  );
}

test('sitemap: 루트/posts의 lastmod는 빌드 날짜가 아니라 최신 글 날짜', () => {
  const posts = [
    makePost({ slug: 'old', date: '2025-01-01' }),
    makePost({ slug: 'newest', date: '2026-02-20' }),
    makePost({ slug: 'mid', date: '2025-08-15' }),
  ];
  const xml = buildSitemapXml(posts, TODAY, SITE);

  for (const loc of [`${SITE}/`, `${SITE}/posts/`]) {
    const block = staticBlock(xml, loc);
    expect(block, `${loc} block must exist`).toBeTruthy();
    expect(block?.[1], `${loc}의 lastmod는 최신 글 날짜여야 함`).toMatch(
      /<lastmod>2026-02-20<\/lastmod>/,
    );
    expect(
      block?.[1],
      `${loc}의 lastmod에 빌드 날짜가 들어가면 안 됨`,
    ).not.toContain(TODAY);
  }
});

test('sitemap: updatedAt이 가장 최신이면 그 값이 정적 URL lastmod가 됨', () => {
  const posts = [
    makePost({ slug: 'a', date: '2026-01-01' }),
    makePost({ slug: 'b', date: '2025-06-01', updatedAt: '2026-04-09' }),
  ];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  const block = staticBlock(xml, `${SITE}/`);
  expect(block).toBeTruthy();
  expect(block?.[1]).toMatch(/<lastmod>2026-04-09<\/lastmod>/);
});

test('sitemap: about의 lastmod는 손으로 관리하는 상수 (빌드 날짜가 아님)', () => {
  // about은 글이 아니라 자동으로 알 수 있는 수정 시각이 없다. 그렇다고 lastmod를
  // 비워 두면 46개 URL 중 여기만 신호가 없고, today를 넣으면 매일 도는 cron
  // 빌드마다 전진해 Google이 사이트 전체의 lastmod를 무시한다. 그래서 상수다.
  const xml = buildSitemapXml([makePost({ slug: 'a' })], TODAY, SITE);
  const block = staticBlock(xml, `${SITE}/about/`);
  expect(block, 'about block must exist').toBeTruthy();
  expect(block?.[1]).toMatch(
    new RegExp(`<lastmod>${ABOUT_PAGE_MODIFIED}</lastmod>`),
  );
  expect(
    block?.[1],
    'about에 빌드 날짜가 들어가면 매 빌드마다 전진한다',
  ).not.toContain(`<lastmod>${TODAY}</lastmod>`);
});

test('sitemap: date 없는 글이 섞여도 정적 lastmod가 today로 튀지 않음', () => {
  // date/updatedAt이 없는 글의 lastmod는 today 폴백값이라 콘텐츠 날짜가 아니다.
  // 이걸 최댓값 계산에 섞으면 today가 항상 이겨서 lastmod가 매일 전진한다.
  const posts = [
    makePost({ slug: 'dated', date: '2026-02-20' }),
    makePost({ slug: 'undated', date: null, updatedAt: null }),
  ];
  const xml = buildSitemapXml(posts, TODAY, SITE);

  for (const loc of [`${SITE}/`, `${SITE}/posts/`]) {
    const block = staticBlock(xml, loc);
    expect(block, `${loc} block must exist`).toBeTruthy();
    expect(block?.[1], `${loc}은 date 있는 글의 날짜만 반영해야 함`).toMatch(
      /<lastmod>2026-02-20<\/lastmod>/,
    );
    expect(
      block?.[1],
      `${loc}에 빌드 날짜가 새어 들어가면 안 됨`,
    ).not.toContain(TODAY);
  }

  // 정작 그 글 자신의 lastmod는 today 폴백을 유지한다.
  const undated = xml.match(
    /<url>\s*<loc>https:\/\/example\.dev\/posts\/undated\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/,
  );
  expect(undated, 'undated post block must exist').toBeTruthy();
  expect(undated?.[1]).toBe(TODAY);
});

test('sitemap: 모든 글에 date가 없으면 정적 lastmod는 today로 폴백', () => {
  const posts = [
    makePost({ slug: 'a', date: null, updatedAt: null }),
    makePost({ slug: 'b', date: null, updatedAt: null }),
  ];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  const block = staticBlock(xml, `${SITE}/`);
  expect(block).toBeTruthy();
  expect(block?.[1]).toMatch(new RegExp(`<lastmod>${TODAY}</lastmod>`));
});

test('sitemap: 글이 하나도 없으면 정적 lastmod는 today로 폴백', () => {
  const xml = buildSitemapXml([], TODAY, SITE);
  const block = staticBlock(xml, `${SITE}/`);
  expect(block).toBeTruthy();
  expect(block?.[1]).toMatch(new RegExp(`<lastmod>${TODAY}</lastmod>`));
});

test('getPostPriority: 고우선 slug는 0.8 (HIGH_PRIORITY_SLUGS 전부 0.8)', () => {
  // 상수에서 직접 참조 — slug 목록이 변경되어도 테스트가 자동으로 맞춰짐.
  for (const slug of HIGH_PRIORITY_SLUGS) {
    expect(getPostPriority({ slug }), `${slug} priority`).toBe('0.8');
  }
});

test('getPostPriority: 고우선 폴더는 0.75 (HIGH_PRIORITY_FOLDERS 전부 0.75)', () => {
  for (const relativeDir of HIGH_PRIORITY_FOLDERS) {
    expect(
      getPostPriority({ slug: 'arbitrary', relativeDir }),
      `${relativeDir} folder priority`,
    ).toBe('0.75');
  }
});

test('getPostPriority: 시리즈가 아닌 고우선 폴더도 0.75', () => {
  // `typescript` 폴더에는 `_series.yml`이 없어 글의 series가 비어 있다.
  // 우선순위를 series로 판정하면 이 글이 조용히 0.6으로 떨어진다.
  expect(HIGH_PRIORITY_FOLDERS.has('typescript')).toBeTruthy();
  expect(
    getPostPriority({ slug: 'arbitrary', relativeDir: 'typescript' }),
  ).toBe('0.75');
});

test('getPostPriority: 그 외는 0.6', () => {
  expect(getPostPriority({ slug: 'x' })).toBe('0.6');
  expect(getPostPriority({ slug: 'x', relativeDir: 'random-folder' })).toBe(
    '0.6',
  );
});

test('sitemap: URL 절대 경로 형식 (loc은 https://...로 시작)', () => {
  const posts = [makePost({ slug: 'a' })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  expect(locs.length >= 4).toBeTruthy();
  for (const loc of locs) {
    expect(loc.startsWith(SITE), `loc must be absolute: ${loc}`).toBeTruthy();
  }
});

test('sitemap: XML 헤더와 urlset namespace 포함', () => {
  const xml = buildSitemapXml([], TODAY, SITE);
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBeTruthy();
  expect(
    xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
  ).toBeTruthy();
  expect(xml.trimEnd().endsWith('</urlset>')).toBeTruthy();
});

// --- KST 날짜 파싱 회귀 테스트 ---
// 'YYYY-MM-DD' 형식의 date/updatedAt은 KST 날짜 의도이므로
// lastmod가 하루 밀리지 않아야 합니다.

test('sitemap: YYYY-MM-DD date의 lastmod는 KST 기준으로 동일 날짜', () => {
  // '2025-12-31'은 KST 2025-12-31 자정을 의도합니다.
  // UTC 자정으로 파싱 후 toISOString().split('T')[0]를 하면 '2025-12-30'이 됩니다.
  // KST 기준으로 날짜를 추출하면 '2025-12-31'이어야 합니다.
  const posts = [makePost({ slug: 'a', date: '2025-12-31' })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  expect(
    xml.includes('<lastmod>2025-12-31</lastmod>'),
    'KST 날짜 의도 YYYY-MM-DD의 lastmod가 하루 밀리면 안 됨',
  ).toBeTruthy();
});

test('sitemap: YYYY-MM-DD date가 UTC 자정으로 파싱되면 lastmod가 하루 밀리는 버그 방지', () => {
  // 버그 상태: new Date('2025-12-31').toISOString().split('T')[0] = '2025-12-30'
  // (UTC 자정 = 2025-12-31T00:00:00Z이지만 ISO split은 UTC 기준이라 하루 전날이 됨)
  // 수정 후: getKSTDateISO(parseScheduledDateKST('2025-12-31')) = '2025-12-31'
  const posts = [makePost({ slug: 'a', date: '2025-12-31' })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  const correctLastmod = getKSTDateISO(parseScheduledDateKST('2025-12-31')); // '2025-12-31'
  // 핵심: UTC+9 미만 TZ에서 getKSTDateISO를 쓰면 lastmod가 올바르게 유지됨
  expect(correctLastmod).toBe('2025-12-31');
  expect(xml.includes(`<lastmod>${correctLastmod}</lastmod>`)).toBeTruthy();
});

test('sitemap: offset 포함 ISO 8601 date는 KST 날짜로 변환', () => {
  // '2026-03-10T09:00:00+09:00' → KST 2026-03-10 09:00 → KST 날짜: '2026-03-10'
  const posts = [
    makePost({ slug: 'a', date: '2026-03-10T09:00:00+09:00', updatedAt: null }),
  ];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  const expected = getKSTDateISO(
    parseScheduledDateKST('2026-03-10T09:00:00+09:00'),
  );
  expect(expected).toBe('2026-03-10');
  expect(xml.includes(`<lastmod>${expected}</lastmod>`)).toBeTruthy();
});
