/**
 * 실제 `apps/blog/posts/` 디렉토리를 읽어
 * - 도메인 계약(공개 글의 필수 필드 등)
 * - 빌드 산출물(sitemap/rss/search-index/llms-full)의 핵심 불변식
 * 을 잠그는 회귀 테스트입니다.
 *
 * 리팩토링/리디자인 시 데이터 형태가 깨지지 않았는지 빠르게 검출하는 가드레일.
 * 콘텐츠 개수 자체는 잠그지 않습니다(글이 추가/숨김되는 정상 변경에 깨지면 안 됨).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAllPosts, getAllPostsIncludingHidden } from './service';
import { isPostVisible } from './visibility';
import { buildSitemapXml } from '../../generate-sitemap';
import { buildRssXml } from '../../generate-rss';
import {
  buildAdminPostsIndex,
  buildPublicSearchIndex,
  CONTENT_PREVIEW_CHARS,
} from '../../scripts/generate-search-index';
import { buildLlmsFullText } from '../../scripts/generate-llms-full';
import { SITE_URL } from '../../lib/constants';

const TODAY = '2026-05-16';

test('contract: 글이 1개 이상 존재 (블로그 동작의 최소 조건)', () => {
  const posts = getAllPostsIncludingHidden();
  assert.ok(posts.length > 0, 'apps/blog/posts/ 에 1개 이상의 글이 있어야 함');
});

test('contract: 모든 글은 unique slug 보유', () => {
  const posts = getAllPostsIncludingHidden();
  const slugs = posts.map(p => p.slug);
  const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  assert.deepEqual(dup, [], `중복 slug 발견: ${dup.join(', ')}`);
});

test('contract: 모든 글은 title 보유', () => {
  const posts = getAllPostsIncludingHidden();
  const missing = posts.filter(p => !p.title || typeof p.title !== 'string');
  assert.equal(
    missing.length,
    0,
    `title 누락: ${missing.map(p => p.slug).join(', ')}`,
  );
});

test('contract: 모든 글은 readMin >= 1', () => {
  const posts = getAllPostsIncludingHidden();
  const invalid = posts.filter(
    p => !Number.isFinite(p.readMin) || p.readMin < 1,
  );
  assert.equal(
    invalid.length,
    0,
    `readMin 비정상: ${invalid.map(p => `${p.slug}(${p.readMin})`).join(', ')}`,
  );
});

test('contract: 공개 글(getAllPosts)은 isPostVisible 기준 일치', () => {
  const all = getAllPostsIncludingHidden();
  const visible = getAllPosts();
  const expected = all.filter(p =>
    isPostVisible({ status: p.status, scheduledDate: p.scheduledDate }),
  );
  assert.equal(visible.length, expected.length);
});

test('contract: getAllPosts는 date 내림차순', () => {
  const posts = getAllPosts();
  for (let i = 0; i + 1 < posts.length; i++) {
    const a = posts[i].date ?? '';
    const b = posts[i + 1].date ?? '';
    // a >= b 여야 함 (null/undefined는 최하위로 정렬됨)
    if (a && b) {
      assert.ok(
        new Date(a).getTime() >= new Date(b).getTime(),
        `정렬 위배: ${posts[i].slug}(${a}) < ${posts[i + 1].slug}(${b})`,
      );
    }
  }
});

test('contract: status 값이 유효 enum 범위', () => {
  const valid = new Set(['published', 'draft', 'scheduled']);
  const posts = getAllPostsIncludingHidden();
  const invalid = posts.filter(p => p.status && !valid.has(p.status));
  assert.equal(invalid.length, 0);
});

test('contract: scheduled 상태면 scheduledDate가 ISO 파싱 가능', () => {
  const posts = getAllPostsIncludingHidden();
  for (const p of posts) {
    if (p.status === 'scheduled') {
      assert.ok(p.scheduledDate, `${p.slug}: scheduled인데 scheduledDate 없음`);
      assert.ok(
        !Number.isNaN(Date.parse(p.scheduledDate!)),
        `${p.slug}: scheduledDate 파싱 불가 (${p.scheduledDate})`,
      );
    }
  }
});

// ---------- 빌드 산출물 회귀 ----------

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
  const hidden = getAllPostsIncludingHidden().filter(
    p => !isPostVisible({ status: p.status, scheduledDate: p.scheduledDate }),
  );
  for (const p of hidden) {
    assert.ok(
      !xml.includes(`/posts/${p.slug}/`),
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
