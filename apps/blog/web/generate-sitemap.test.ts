import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildSitemapXml,
  getPostPriority,
  HIGH_PRIORITY_SERIES,
  HIGH_PRIORITY_SLUGS,
} from './generate-sitemap';
import type { SitemapPost } from './generate-sitemap';

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
    series: undefined,
    ...over,
  };
}

test('sitemap: 정적 URL 3개(루트/posts/about)가 포함됨', () => {
  const xml = buildSitemapXml([], TODAY, SITE);
  assert.ok(xml.includes(`<loc>${SITE}/</loc>`));
  assert.ok(xml.includes(`<loc>${SITE}/posts/</loc>`));
  assert.ok(xml.includes(`<loc>${SITE}/about/</loc>`));
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
  assert.equal(count, staticCount + posts.length);
});

test('sitemap: slug의 특수문자가 URL 인코딩됨 (디렉토리 구분자는 보존)', () => {
  const posts = [makePost({ slug: 'series/한글 slug' })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  assert.ok(xml.includes('/posts/series/'));
  assert.ok(xml.includes(encodeURIComponent('한글 slug')));
  // 디렉토리 구분자는 보존되어 인코딩되지 않음
  assert.ok(!xml.includes(encodeURIComponent('series/')));
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
  assert.ok(xml.includes('<lastmod>2026-03-10</lastmod>'));
});

test('sitemap: updatedAt 없으면 lastmod = date', () => {
  const posts = [makePost({ slug: 'a', date: '2025-12-31' })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  assert.ok(xml.includes('<lastmod>2025-12-31</lastmod>'));
});

test('sitemap: date도 updatedAt도 없으면 lastmod = today', () => {
  const posts = [makePost({ slug: 'a', date: null, updatedAt: null })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  // 정적 URL의 lastmod도 today지만, 포스트의 lastmod도 today여야 함
  assert.ok(xml.includes(`<loc>${SITE}/posts/a/</loc>`));
  // 같은 URL 블록 내에 today가 들어가는지
  const block = xml.match(
    /<url>\s*<loc>https:\/\/example\.dev\/posts\/a\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/,
  );
  assert.ok(block, 'post url block must exist');
  assert.equal(block[1], TODAY);
});

test('getPostPriority: 고우선 slug는 0.8 (HIGH_PRIORITY_SLUGS 전부 0.8)', () => {
  // 상수에서 직접 참조 — slug 목록이 변경되어도 테스트가 자동으로 맞춰짐.
  for (const slug of HIGH_PRIORITY_SLUGS) {
    assert.equal(getPostPriority({ slug }), '0.8', `${slug} priority`);
  }
});

test('getPostPriority: 고우선 시리즈는 0.75 (HIGH_PRIORITY_SERIES 전부 0.75)', () => {
  for (const series of HIGH_PRIORITY_SERIES) {
    assert.equal(
      getPostPriority({ slug: 'arbitrary', series }),
      '0.75',
      `${series} series priority`,
    );
  }
});

test('getPostPriority: 그 외는 0.6', () => {
  assert.equal(getPostPriority({ slug: 'x' }), '0.6');
  assert.equal(getPostPriority({ slug: 'x', series: 'random-series' }), '0.6');
});

test('sitemap: URL 절대 경로 형식 (loc은 https://...로 시작)', () => {
  const posts = [makePost({ slug: 'a' })];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(locs.length >= 4);
  for (const loc of locs) {
    assert.ok(loc.startsWith(SITE), `loc must be absolute: ${loc}`);
  }
});

test('sitemap: XML 헤더와 urlset namespace 포함', () => {
  const xml = buildSitemapXml([], TODAY, SITE);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(
    xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
  );
  assert.ok(xml.trimEnd().endsWith('</urlset>'));
});
