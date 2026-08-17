/**
 * 실제 `apps/blog/posts/` 디렉토리를 읽어 **빌드 산출물**(sitemap/rss/
 * search-index/llms-full)의 핵심 불변식을 잠그는 회귀 테스트입니다.
 *
 * 도메인 계약(공개 글 필드·시리즈 단일 출처)은 `src/post/contract.test.ts`에
 * 있습니다 — 산출물 계약은 생성기(scripts)를 import해야 해서 여기(scripts/)로
 * 분리했습니다. post 쪽에 두면 content → build 역의존이 생겨 boundaries가
 * 막는 방향입니다.
 *
 * 콘텐츠 개수 자체는 잠그지 않습니다(글이 추가/숨김되는 정상 변경에 깨지면 안 됨).
 */
import { expect, test } from 'vitest';
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
    expect(
      xml.includes(
        `/posts/${encodeURIComponent(p.slug).replace(/%2F/g, '/')}/`,
      ),
      `sitemap 누락: ${p.slug}`,
    ).toBeTruthy();
  }
});

test('sitemap: draft/미래 scheduled 글은 sitemap에 없음', () => {
  const xml = buildSitemapXml(getAllPosts(), TODAY);
  const hidden = getAllPostsIncludingHidden().filter(p => !isPostVisible(p));
  for (const p of hidden) {
    // 한글/특수문자 slug의 hidden 글이 sitemap에 잘못 포함됐을 때 false pass 방지를 위해
    // public 검사와 동일한 인코딩 규칙으로 비교합니다 (디렉토리 구분자 / 는 보존).
    const encodedSlug = encodeURIComponent(p.slug).replace(/%2F/g, '/');
    expect(
      !xml.includes(`/posts/${encodedSlug}/`),
      `숨김 글이 sitemap에 노출: ${p.slug}`,
    ).toBeTruthy();
  }
});

test('sitemap: 모든 loc은 절대 URL', () => {
  const xml = buildSitemapXml(getAllPosts(), TODAY);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  expect(locs.length > 0).toBeTruthy();
  for (const loc of locs) {
    expect(loc.startsWith(SITE_URL), `절대 URL 위배: ${loc}`).toBeTruthy();
  }
});

test('rss: 모든 공개 글이 RSS item으로 등장', () => {
  const posts = getAllPosts();
  const xml = buildRssXml(posts, { now: new Date(TODAY) });
  const itemCount = (xml.match(/<item>/g) || []).length;
  expect(itemCount).toBe(posts.length);
});

test('rss: 모든 link/guid가 SITE_URL prefix', () => {
  const xml = buildRssXml(getAllPosts(), { now: new Date(TODAY) });
  const links = [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map(m => m[1]);
  for (const link of links) {
    expect(link.startsWith(SITE_URL), `RSS link 비절대: ${link}`).toBeTruthy();
  }
});

test('search-index: 공개 글 개수와 일치', () => {
  const posts = getAllPosts();
  const idx = buildPublicSearchIndex(posts);
  expect(idx.length).toBe(posts.length);
});

test('search-index: 모든 entry는 필수 키 보유', () => {
  const idx = buildPublicSearchIndex(getAllPosts());
  for (const e of idx) {
    expect(typeof e.slug === 'string' && e.slug.length > 0).toBeTruthy();
    expect(typeof e.title === 'string' && e.title.length > 0).toBeTruthy();
    expect(Array.isArray(e.tags)).toBeTruthy();
    expect(typeof e.contentPreview === 'string').toBeTruthy();
    expect(e.contentPreview.length <= CONTENT_PREVIEW_CHARS).toBeTruthy();
  }
});

test('search-index(admin): draft/scheduled 포함하여 전체 글 인덱싱', () => {
  const all = getAllPostsIncludingHidden();
  const idx = buildAdminPostsIndex(all);
  expect(idx.length).toBe(all.length);
  // 적어도 1개의 status 값이 admin index에 존재
  for (const e of idx) {
    expect(['published', 'draft', 'scheduled'].includes(e.status)).toBeTruthy();
  }
});

test('llms-full: 모든 공개 글 제목이 본문에 등장', () => {
  const posts = getAllPosts();
  const text = buildLlmsFullText(posts);
  for (const p of posts) {
    expect(
      text.includes(`### [${p.title}]`),
      `llms-full 누락: ${p.slug} (${p.title})`,
    ).toBeTruthy();
  }
});

test('llms-full: Total posts 카운트가 실제 공개 글 수와 일치', () => {
  const posts = getAllPosts();
  const text = buildLlmsFullText(posts);
  expect(text.includes(`Total posts: ${posts.length}+ articles`)).toBeTruthy();
});

test('contract: 검색 인덱스의 series는 선언된 시리즈만', () => {
  // 예전엔 폴더에 글을 모아 두는 것만으로 검색 결과에 "📚 폴더명"이 붙었다.
  for (const e of buildPublicSearchIndex(getAllPosts())) {
    if (e.series) {
      expect(
        isSeriesFolder(e.series),
        `검색 인덱스에 비시리즈: ${e.series}`,
      ).toBeTruthy();
    }
  }
});

test('contract: sitemap 우선순위는 시리즈가 아니라 폴더 기준이다', () => {
  // `typescript` 폴더에는 `_series.yml`이 없다. series로 판정하면 이 글의
  // 우선순위가 조용히 0.6으로 떨어진다.
  const post = getAllPosts().find(p => p.relativeDir === 'typescript');
  if (!post) return; // 콘텐츠가 바뀌어 폴더가 사라지면 이 계약은 무의미해진다
  expect(post.series, 'typescript 폴더는 시리즈가 아니어야 함').toBe(undefined);
  expect(getPostPriority(post)).toBe('0.75');
});
