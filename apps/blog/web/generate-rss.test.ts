import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRssXml, escapeXml } from './generate-rss';
import type { RssPost } from './generate-rss';
import { parseScheduledDateKST } from './lib/dates';

const NOW = new Date('2026-05-16T00:00:00Z');
const SITE = 'https://example.dev';
const NAME = 'Test Blog';
const DESC = '테스트용 설명';

function makePost(over: Partial<RssPost> = {}): RssPost {
  return {
    slug: 'hello-world',
    title: 'Hello',
    date: '2026-05-09',
    excerpt: undefined,
    ...over,
  };
}

const OPTS = {
  siteUrl: SITE,
  siteName: NAME,
  siteDescription: DESC,
  now: NOW,
};

test('escapeXml: &, <, >, ", \' 모두 엔티티로 치환', () => {
  assert.equal(
    escapeXml(`<a href="x">"hi" & 'bye' </a>`),
    `&lt;a href=&quot;x&quot;&gt;&quot;hi&quot; &amp; &apos;bye&apos; &lt;/a&gt;`,
  );
});

test('escapeXml: & 는 entity awareness 없이 항상 &amp; 로 인코딩 (동작 잠금)', () => {
  // 현재 구현은 raw text만 입력으로 가정 — 이미 escape된 &amp;가 들어오면
  // &amp;amp; 로 이중 인코딩됨. RSS의 title/excerpt는 frontmatter raw text라
  // 이 가정이 성립하지만, entity-aware escape로 교체 시 이 테스트가 실패해
  // 회귀를 감지하도록 잠가둡니다.
  assert.equal(escapeXml('A & B'), 'A &amp; B');
});

test('rss: 헤더와 channel 구조 포함', () => {
  const xml = buildRssXml([], OPTS);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<rss version="2.0"'));
  assert.ok(xml.includes('<channel>'));
  assert.ok(xml.includes(`<link>${SITE}</link>`));
  assert.ok(xml.includes(`<description>${DESC}</description>`));
  assert.ok(xml.includes('<language>ko</language>'));
  assert.ok(xml.trimEnd().endsWith('</rss>'));
});

test('rss: lastBuildDate가 now.toUTCString()', () => {
  const xml = buildRssXml([], OPTS);
  assert.ok(
    xml.includes(`<lastBuildDate>${NOW.toUTCString()}</lastBuildDate>`),
  );
});

test('rss: siteDescription에 。이 있으면 channel title은 첫 문장만 사용', () => {
  const xml = buildRssXml([], {
    ...OPTS,
    siteDescription: '첫 문장。두 번째 문장',
  });
  // channel <title>은 split 결과의 첫 토큰만 사용
  assert.ok(xml.includes('<title>Test Blog | 첫 문장</title>'));
  // 단, channel <description>은 원본을 그대로 유지
  assert.ok(xml.includes('<description>첫 문장。두 번째 문장</description>'));
});

test('rss: atom:link self 참조', () => {
  const xml = buildRssXml([], OPTS);
  assert.ok(
    xml.includes(
      `<atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ),
  );
});

test('rss: 포스트 개수만큼 <item> 블록', () => {
  const posts = [
    makePost({ slug: 'a' }),
    makePost({ slug: 'b' }),
    makePost({ slug: 'c' }),
  ];
  const xml = buildRssXml(posts, OPTS);
  assert.equal((xml.match(/<item>/g) || []).length, 3);
});

test('rss: 각 item은 title/link/guid/pubDate 포함', () => {
  const xml = buildRssXml([makePost({ slug: 'a', title: 'A' })], OPTS);
  assert.ok(xml.includes('<title>A</title>'));
  assert.ok(xml.includes(`<link>${SITE}/posts/a/</link>`));
  assert.ok(xml.includes(`<guid isPermaLink="true">${SITE}/posts/a/</guid>`));
  assert.ok(xml.includes('<pubDate>'));
});

test('rss: title에 특수문자가 있으면 escape', () => {
  const xml = buildRssXml(
    [makePost({ slug: 'a', title: '<test> & "quoted"' })],
    OPTS,
  );
  assert.ok(
    xml.includes('<title>&lt;test&gt; &amp; &quot;quoted&quot;</title>'),
  );
});

test('rss: slug의 특수문자는 URL 인코딩됨', () => {
  const xml = buildRssXml([makePost({ slug: '한글-slug' })], OPTS);
  assert.ok(xml.includes(encodeURIComponent('한글-slug')));
});

test('rss: pubDate가 date 기준 (KST-aware 파싱)', () => {
  // 'YYYY-MM-DD' 형식의 date는 KST 자정으로 파싱되어야 합니다.
  // 기존 `new Date('YYYY-MM-DD')`는 UTC 자정으로 해석해 9시간 빠른 날짜를 출력했습니다.
  const xml = buildRssXml([makePost({ slug: 'a', date: '2026-05-09' })], OPTS);
  const expected = parseScheduledDateKST('2026-05-09').toUTCString();
  assert.ok(xml.includes(`<pubDate>${expected}</pubDate>`));
});

test('rss: YYYY-MM-DD pubDate는 UTC 자정이 아닌 KST 자정 기준 — 9시간 shift 없음', () => {
  // '2026-05-09' (KST) → UTC 2026-05-08 15:00:00 (KST 자정)
  // 버그 상태(UTC 자정): 'Fri, 08 May 2026 00:00:00 GMT'
  // 수정 후(KST 자정): 'Thu, 07 May 2026 15:00:00 GMT'  (UTC 기준 하루 이전 15시)
  const xml = buildRssXml([makePost({ slug: 'a', date: '2026-05-09' })], OPTS);
  // KST 자정은 UTC 전날 15시. 'YYYY-MM-DD'를 그대로 new Date()에 넣으면 UTC
  // 자정으로 해석되므로 buggy/correct는 항상 다른 시각(서로 9시간 차).
  // 즉 분기 가드 없이 두 단언을 모두 실행해도 안전합니다.
  assert.ok(
    xml.includes(
      `<pubDate>${parseScheduledDateKST('2026-05-09').toUTCString()}</pubDate>`,
    ),
    'KST 자정 기준 pubDate를 포함해야 함',
  );
  assert.ok(
    !xml.includes(`<pubDate>${new Date('2026-05-09').toUTCString()}</pubDate>`),
    'UTC 자정(버그) 기준 pubDate가 포함되면 안 됨',
  );
});

test('rss: offset 포함 ISO 8601 date는 그대로 파싱', () => {
  // '+09:00' offset이 있으면 KST임이 명시적 → 그대로 파싱
  const xml = buildRssXml(
    [makePost({ slug: 'a', date: '2026-05-09T09:00:00+09:00' })],
    OPTS,
  );
  const expected = new Date('2026-05-09T09:00:00+09:00').toUTCString(); // = 2026-05-09 00:00:00 UTC
  assert.ok(xml.includes(`<pubDate>${expected}</pubDate>`));
});

test('rss: date 없으면 now.toUTCString() fallback', () => {
  const xml = buildRssXml([makePost({ slug: 'a', date: null })], OPTS);
  // item의 pubDate가 now와 같아야 함
  const match = xml.match(/<item>[\s\S]*?<pubDate>([^<]+)<\/pubDate>/);
  assert.ok(match);
  assert.equal(match[1], NOW.toUTCString());
});

test('rss: excerpt가 있으면 <description> 추가, 없으면 생략', () => {
  const withExcerpt = buildRssXml(
    [makePost({ slug: 'a', excerpt: '요약' })],
    OPTS,
  );
  assert.ok(
    /<item>[\s\S]*?<description>요약<\/description>[\s\S]*?<\/item>/.test(
      withExcerpt,
    ),
  );

  const withoutExcerpt = buildRssXml([makePost({ slug: 'a' })], OPTS);
  // item 내부에는 description이 없어야 함 (channel 레벨은 별개)
  const itemBlock = withoutExcerpt.match(/<item>[\s\S]*?<\/item>/)?.[0] ?? '';
  assert.ok(!itemBlock.includes('<description>'));
});

test('rss: excerpt도 escape됨', () => {
  const xml = buildRssXml([makePost({ slug: 'a', excerpt: 'a & b' })], OPTS);
  assert.ok(xml.includes('<description>a &amp; b</description>'));
});
