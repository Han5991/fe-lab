import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSitemapXml, getPostPriority } from './generate-sitemap';
import type { SitemapPost } from './generate-sitemap';

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
  const posts = [
    makePost({ slug: 'a' }),
    makePost({ slug: 'b' }),
    makePost({ slug: 'c' }),
  ];
  const xml = buildSitemapXml(posts, TODAY, SITE);
  const count = (xml.match(/<url>/g) || []).length;
  // 정적 3 + 포스트 3
  assert.equal(count, 6);
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

test('getPostPriority: 고우선 slug는 0.8', () => {
  assert.equal(getPostPriority({ slug: 'nodejs-contribution' }), '0.8');
  assert.equal(
    getPostPriority({ slug: 'first-open-source-contribution' }),
    '0.8',
  );
});

test('getPostPriority: 고우선 시리즈는 0.75', () => {
  assert.equal(getPostPriority({ slug: 'x', series: 'bundler' }), '0.75');
  assert.equal(getPostPriority({ slug: 'x', series: 'open-source' }), '0.75');
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
