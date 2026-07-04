import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildRssXml,
  escapeXml,
  renderContentHtml,
  wrapCdata,
} from './generate-rss';
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

test('rss: content 네임스페이스 선언 포함', () => {
  const xml = buildRssXml([], OPTS);
  assert.ok(
    xml.includes('xmlns:content="http://purl.org/rss/1.0/modules/content/"'),
  );
});

test('rss: content가 있으면 content:encoded에 HTML 전문 포함', () => {
  const xml = buildRssXml(
    [makePost({ slug: 'a', content: '## 소제목\n\n본문 **강조** 텍스트' })],
    OPTS,
  );
  assert.ok(xml.includes('<content:encoded><![CDATA['));
  assert.ok(xml.includes('<h2>소제목</h2>'));
  assert.ok(xml.includes('<strong>강조</strong>'));
  assert.ok(xml.includes(']]></content:encoded>'));
});

test('rss: content 없으면 content:encoded 생략', () => {
  const xml = buildRssXml([makePost({ slug: 'a' })], OPTS);
  assert.ok(!xml.includes('<content:encoded>'));
});

test('rss: 상대 경로 이미지는 절대 URL로 변환', () => {
  const xml = buildRssXml(
    [
      makePost({
        slug: 'a',
        content: '![스크린샷](./pic.png)',
        relativeDir: 'series-a',
      }),
    ],
    OPTS,
  );
  assert.ok(xml.includes(`src="${SITE}/posts/series-a/pic.png"`));
});

test('rss: 절대 URL 이미지는 그대로 유지', () => {
  const xml = buildRssXml(
    [
      makePost({
        slug: 'a',
        content: '![외부](https://example.com/x.png)',
        relativeDir: 'series-a',
      }),
    ],
    OPTS,
  );
  assert.ok(xml.includes('src="https://example.com/x.png"'));
});

test('rss: 루트 레벨 포스트(relativeDir 없음) 이미지도 /posts/ 프리픽스 유지', () => {
  // sync-posts는 posts/ 루트의 이미지를 public/posts/ 바로 아래로 복사한다.
  // 예: 'pnpm 10 업그레이드' 글의 ./pnpm.img_1.png → /posts/pnpm.img_1.png
  const xml = buildRssXml(
    [makePost({ slug: 'a', content: '![img](./pnpm.img_1.png)' })],
    OPTS,
  );
  assert.ok(xml.includes(`src="${SITE}/posts/pnpm.img_1.png"`));
});

test('rss: 한글/공백 relativeDir는 percent-encoding됨', () => {
  const xml = buildRssXml(
    [
      makePost({
        slug: 'a',
        content: '![img](./pic.png)',
        relativeDir: 'nextjs deploy',
      }),
    ],
    OPTS,
  );
  assert.ok(xml.includes(`src="${SITE}/posts/nextjs%20deploy/pic.png"`));
});

test('rss: 하위 디렉토리 이미지 경로의 슬래시는 %2F로 인코딩되지 않고 보존', () => {
  const xml = buildRssXml(
    [
      makePost({
        slug: 'a',
        content: '![img](img/start.png)',
        relativeDir: 'feconf',
      }),
    ],
    OPTS,
  );
  assert.ok(xml.includes(`src="${SITE}/posts/feconf/img/start.png"`));
});

test('renderContentHtml: 한글 경로는 단일 인코딩 (이중 인코딩 %25 없음)', () => {
  const html = renderContentHtml('![img](./한글.png)', SITE, '회고');
  assert.ok(
    html.includes(`src="${SITE}/posts/%ED%9A%8C%EA%B3%A0/`),
    `relativeDir가 인코딩되어야 함: ${html}`,
  );
  assert.ok(!html.includes('%25'), `이중 인코딩 감지: ${html}`);
});

test('renderContentHtml: 루트 상대 경로는 siteUrl만 prefix', () => {
  const html = renderContentHtml('![img](/posts/x/pic.png)', SITE, 'ignored');
  assert.ok(html.includes(`src="${SITE}/posts/x/pic.png"`));
});

test('renderContentHtml: <callout>은 blockquote + 라벨로 매핑', () => {
  const html = renderContentHtml(
    '<callout type="warning">조심하세요</callout>',
    SITE,
  );
  assert.ok(html.includes('<blockquote>'), html);
  assert.ok(html.includes('<strong>⚠️ Warning</strong>'), html);
  assert.ok(html.includes('조심하세요'), html);
  assert.ok(!html.includes('<callout'), 'raw callout 태그가 남으면 안 됨');
});

test('renderContentHtml: callout title 속성이 라벨을 대체', () => {
  const html = renderContentHtml(
    '<callout type="tip" title="꿀팁">내용</callout>',
    SITE,
  );
  assert.ok(html.includes('<strong>💡 꿀팁</strong>'), html);
});

test('renderContentHtml: 알 수 없는 callout type은 info로 폴백', () => {
  const html = renderContentHtml('<callout>내용</callout>', SITE);
  assert.ok(html.includes('<strong>ℹ️ Info</strong>'), html);
});

test('renderContentHtml: <file-tree>는 pre로 매핑', () => {
  const html = renderContentHtml(
    '<file-tree>\nsrc/\n  index.ts\n</file-tree>',
    SITE,
  );
  assert.ok(html.includes('<pre>'), html);
  assert.ok(!html.includes('<file-tree'), 'raw file-tree 태그가 남으면 안 됨');
});

test('renderContentHtml: javascript: 등 위험 프로토콜은 기본 sanitizer로 차단', () => {
  const html = renderContentHtml('[클릭](javascript:alert(1))', SITE);
  assert.ok(!html.includes('javascript:'), html);
  // 허용 프로토콜(https)은 그대로 통과
  const ok = renderContentHtml('[링크](https://example.com/)', SITE);
  assert.ok(ok.includes('href="https://example.com/"'), ok);
});

test('rss: fullContentLimit 이후 글은 content:encoded 생략 (피드 크기 제한)', () => {
  const posts = [
    makePost({ slug: 'newest', content: '# 최신 글' }),
    makePost({ slug: 'older', content: '# 옛날 글' }),
  ];
  const xml = buildRssXml(posts, { ...OPTS, fullContentLimit: 1 });
  assert.equal((xml.match(/<content:encoded>/g) || []).length, 1);
  // 최신(앞쪽) 글만 전문 포함, 이후 글은 item 자체는 유지
  assert.ok(xml.includes('최신 글'));
  assert.ok(!xml.includes('옛날 글'));
  assert.equal((xml.match(/<item>/g) || []).length, 2);
});

test('wrapCdata: ]]> 시퀀스는 CDATA 분할로 안전하게 처리', () => {
  const wrapped = wrapCdata('a]]>b');
  assert.equal(wrapped, '<![CDATA[a]]]]><![CDATA[>b]]>');
});
