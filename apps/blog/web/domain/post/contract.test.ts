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
import {
  getAllPosts,
  getAllPostsIncludingHidden,
  getSeriesAdjacentPosts,
} from './service';
import { isPostVisible } from './visibility';
import { isSeriesFolder } from './series';
import { buildSitemapXml, getPostPriority } from '@/scripts/generate-sitemap';
import { buildRssXml } from '@/scripts/generate-rss';
import {
  buildAdminPostsIndex,
  buildPublicSearchIndex,
  CONTENT_PREVIEW_CHARS,
} from '@/scripts/generate-search-index';
import { buildLlmsFullText } from '@/scripts/generate-llms-full';
import { SITE_URL } from '@/lib/constants';

// sitemap lastmod 비교용 — 동적으로 현재 날짜 사용. 하드코딩 시 미래 scheduledDate를
// 가진 글이 공개되었을 때 contract 테스트가 false failure를 내는 문제를 회피.
const TODAY = new Date().toISOString().split('T')[0];

test('contract: 글이 1개 이상 존재 (블로그 동작의 최소 조건)', () => {
  const posts = getAllPostsIncludingHidden();
  assert.ok(posts.length > 0, 'apps/blog/posts/ 에 1개 이상의 글이 있어야 함');
});

test('contract: 모든 글은 unique slug 보유', () => {
  const posts = getAllPostsIncludingHidden();
  const seen = new Set<string>();
  const dup: string[] = [];
  for (const p of posts) {
    if (seen.has(p.slug)) dup.push(p.slug);
    else seen.add(p.slug);
  }
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

test('contract: 공개 글(getAllPosts)은 isPostVisible 기준 일치 (slug 집합 비교)', () => {
  // count만 비교하면 "잘못된 글이 잘못된 글로 대체"되는 필터 버그를 놓침.
  // slug 집합을 정렬해서 deepEqual로 비교해야 실제 동등성을 검증할 수 있음.
  // now를 고정 주입해 두 평가 사이에 scheduled 경계가 교차하는 플레이크를 제거.
  const now = new Date();
  const all = getAllPostsIncludingHidden();
  const visible = getAllPosts(now);
  // PostData를 그대로 넘긴다 — 필드를 골라 넘기면 여기서 가시성 규칙을 재구현하는
  // 꼴이 되어, 규칙이 바뀔 때(예: scheduled의 date 폴백 추가) 조용히 어긋난다.
  const expected = all.filter(p => isPostVisible(p, now));
  const visibleSlugs = visible.map(p => p.slug).sort();
  const expectedSlugs = expected.map(p => p.slug).sort();
  assert.deepEqual(visibleSlugs, expectedSlugs);
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

test('contract: scheduled 글은 공개 시각(scheduledDate ?? date)이 파싱 가능', () => {
  const posts = getAllPostsIncludingHidden();
  for (const p of posts) {
    if (p.status !== 'scheduled') continue;
    // scheduledDate는 시각까지 지정할 때만 쓰는 선택 필드. 없으면 date가 공개 시각.
    const publishAt = p.scheduledDate ?? p.date;
    assert.ok(
      publishAt,
      `${p.slug}: scheduled인데 scheduledDate도 date도 없음 (영원히 비공개)`,
    );
    assert.ok(
      !Number.isNaN(Date.parse(publishAt)),
      `${p.slug}: 공개 시각 파싱 불가 (${publishAt})`,
    );
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

// ─────────────────────────────────────────────────────────────────────────────
// 시리즈 단일 출처
//
// `series`는 `_series.yml`로 선언된 폴더에만 붙는다(`repository.ts`). 판정이 읽는
// 시점 한 곳에서 끝나므로, 아래 불변식이 깨지면 배지·네비게이션뿐 아니라 검색·
// OG 카드·llms까지 한꺼번에 어긋난다.
// ─────────────────────────────────────────────────────────────────────────────

test('contract: series는 _series.yml로 선언된 폴더에만 붙는다', () => {
  const violations = getAllPostsIncludingHidden()
    .filter((p): p is typeof p & { series: string } => Boolean(p.series))
    .filter(p => !isSeriesFolder(p.series))
    .map(p => `${p.slug} (series=${p.series})`);
  assert.deepEqual(violations, []);
});

test('contract: 선언되지 않은 폴더의 글은 시리즈 네비게이션이 없다', () => {
  // relativeDir은 있는데 series가 없는 글 = 폴더에는 있지만 시리즈가 아닌 글.
  const grouped = getAllPosts().filter(p => p.relativeDir && !p.series);
  assert.ok(
    grouped.length > 0,
    '검증이 공허하지 않으려면 시리즈가 아닌 폴더의 공개 글이 최소 1편은 있어야 함',
  );
  for (const p of grouped) {
    const nav = getSeriesAdjacentPosts(p.slug);
    assert.equal(nav.seriesName, null, `${p.slug}: seriesName`);
    assert.equal(nav.prev, null, `${p.slug}: prev`);
    assert.equal(nav.next, null, `${p.slug}: next`);
  }
});

test('contract: 선언된 시리즈의 글은 시리즈 네비게이션이 있다 (대조군)', () => {
  const seriesPosts = getAllPosts().filter(p => p.series);
  assert.ok(seriesPosts.length > 0, '시리즈 글이 최소 1편은 있어야 함');
  for (const p of seriesPosts) {
    assert.ok(
      getSeriesAdjacentPosts(p.slug).seriesName,
      `${p.slug}: 시리즈인데 seriesName이 없음`,
    );
  }
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
