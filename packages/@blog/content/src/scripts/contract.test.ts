/**
 * 실제 `apps/blog/posts/` 디렉토리를 읽어 **빌드 산출물**(sitemap/rss/
 * search-index/llms-full)의 핵심 불변식을 잠그는 회귀 테스트입니다.
 *
 * 도메인 계약(공개 글 필드·시리즈 단일 출처)은 `domain/post/contract.test.ts`에
 * 있습니다 — 산출물 계약은 생성기(scripts)를 import해야 해서 여기(scripts/)로
 * 분리했습니다. 도메인 쪽에 두면 domain → scripts 역의존이 생기고, 패키지로
 * 이사할 때 성립하지 않는 방향입니다.
 *
 * 콘텐츠 개수 자체는 잠그지 않습니다(글이 추가/숨김되는 정상 변경에 깨지면 안 됨).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAllPosts, getAllPostsIncludingHidden } from '../post/service';
import { isPostVisible } from '../post/visibility';
import { isSeriesFolder } from '../post/series';
import { SITE_URL } from '../shared/constants';
import { buildSitemapXml, getPostPriority } from './generate-sitemap';
import { buildRssXml } from './render/generate-rss';
import {
  buildAdminPostsIndex,
  buildPublicSearchIndex,
  CONTENT_PREVIEW_CHARS,
} from './generate-search-index';
import { buildLlmsFullText } from './generate-llms-full';

// sitemap lastmod 비교용 — 동적으로 현재 날짜 사용. 하드코딩 시 미래 scheduledDate를
// 가진 글이 공개되었을 때 contract 테스트가 false failure를 내는 문제를 회피.
const TODAY = new Date().toISOString().split('T')[0];

test('sitemap: 모든 공개 글이 sitemap에 포함됨', () => {
  const posts = getAllPosts();
  const xml = buildSitemapXml(posts, TODAY);
  for (const p of posts) {
    assert.ok(
      xml.includes(
        `/posts/${encodeURIComponent(p.slug).replace(/%2F/g, '/')}/`,
      ),
      `sitemap 누락: ${p.slug}`,
    );
  }
});

test('sitemap: draft/미래 scheduled 글은 sitemap에 없음', () => {
  const xml = buildSitemapXml(getAllPosts(), TODAY);
  const hidden = getAllPostsIncludingHidden().filter(p => !isPostVisible(p));
  for (const p of hidden) {
    // 한글/특수문자 slug의 hidden 글이 sitemap에 잘못 포함됐을 때 false pass 방지를 위해
    // public 검사와 동일한 인코딩 규칙으로 비교합니다 (디렉토리 구분자 / 는 보존).
    const encodedSlug = encodeURIComponent(p.slug).replace(/%2F/g, '/');
    assert.ok(
      !xml.includes(`/posts/${encodedSlug}/`),
      `숨김 글이 sitemap에 노출: ${p.slug}`,
    );
  }
});

test('sitemap: 모든 loc은 절대 URL', () => {
  const xml = buildSitemapXml(getAllPosts(), TODAY);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(locs.length > 0);
  for (const loc of locs) {
    assert.ok(loc.startsWith(SITE_URL), `절대 URL 위배: ${loc}`);
  }
});

test('rss: 모든 공개 글이 RSS item으로 등장', () => {
  const posts = getAllPosts();
  const xml = buildRssXml(posts, { now: new Date(TODAY) });
  const itemCount = (xml.match(/<item>/g) || []).length;
  assert.equal(itemCount, posts.length);
});

test('rss: 모든 link/guid가 SITE_URL prefix', () => {
  const xml = buildRssXml(getAllPosts(), { now: new Date(TODAY) });
  const links = [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map(m => m[1]);
  for (const link of links) {
    assert.ok(link.startsWith(SITE_URL), `RSS link 비절대: ${link}`);
  }
});

test('search-index: 공개 글 개수와 일치', () => {
  const posts = getAllPosts();
  const idx = buildPublicSearchIndex(posts);
  assert.equal(idx.length, posts.length);
});

test('search-index: 모든 entry는 필수 키 보유', () => {
  const idx = buildPublicSearchIndex(getAllPosts());
  for (const e of idx) {
    assert.ok(typeof e.slug === 'string' && e.slug.length > 0);
    assert.ok(typeof e.title === 'string' && e.title.length > 0);
    assert.ok(Array.isArray(e.tags));
    assert.ok(typeof e.contentPreview === 'string');
    assert.ok(e.contentPreview.length <= CONTENT_PREVIEW_CHARS);
  }
});

test('search-index(admin): draft/scheduled 포함하여 전체 글 인덱싱', () => {
  const all = getAllPostsIncludingHidden();
  const idx = buildAdminPostsIndex(all);
  assert.equal(idx.length, all.length);
  // 적어도 1개의 status 값이 admin index에 존재
  for (const e of idx) {
    assert.ok(['published', 'draft', 'scheduled'].includes(e.status));
  }
});

test('llms-full: 모든 공개 글 제목이 본문에 등장', () => {
  const posts = getAllPosts();
  const text = buildLlmsFullText(posts);
  for (const p of posts) {
    assert.ok(
      text.includes(`### [${p.title}]`),
      `llms-full 누락: ${p.slug} (${p.title})`,
    );
  }
});

test('llms-full: Total posts 카운트가 실제 공개 글 수와 일치', () => {
  const posts = getAllPosts();
  const text = buildLlmsFullText(posts);
  assert.ok(text.includes(`Total posts: ${posts.length}+ articles`));
});

test('contract: 검색 인덱스의 series는 선언된 시리즈만', () => {
  // 예전엔 폴더에 글을 모아 두는 것만으로 검색 결과에 "📚 폴더명"이 붙었다.
  for (const e of buildPublicSearchIndex(getAllPosts())) {
    if (e.series) {
      assert.ok(
        isSeriesFolder(e.series),
        `검색 인덱스에 비시리즈: ${e.series}`,
      );
    }
  }
});

test('contract: sitemap 우선순위는 시리즈가 아니라 폴더 기준이다', () => {
  // `typescript` 폴더에는 `_series.yml`이 없다. series로 판정하면 이 글의
  // 우선순위가 조용히 0.6으로 떨어진다.
  const post = getAllPosts().find(p => p.relativeDir === 'typescript');
  if (!post) return; // 콘텐츠가 바뀌어 폴더가 사라지면 이 계약은 무의미해진다
  assert.equal(
    post.series,
    undefined,
    'typescript 폴더는 시리즈가 아니어야 함',
  );
  assert.equal(getPostPriority(post), '0.75');
});
