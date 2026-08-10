import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePageSeo, checkPages, checkFeeds } from './check-seo';
import { SITE_URL } from '../lib/constants';

/** 위반이 하나도 없는 최소 페이지 — 각 테스트는 여기서 한 가지만 망가뜨린다. */
function page(
  over: Partial<Record<string, string>> = {},
  body = '<h1>제목</h1>',
) {
  const o = {
    path: '/posts/a/',
    title: '짧은 제목 | Frontend Lab',
    description: '가'.repeat(130),
    canonical: `${SITE_URL}/posts/a/`,
    siteName: 'Frontend Lab',
    locale: 'ko_KR',
    type: 'article',
    ...over,
  };
  return `<!doctype html><html><head>
    <title>${o.title}</title>
    <meta name="description" content="${o.description}"/>
    <link rel="canonical" href="${o.canonical}"/>
    <meta property="og:site_name" content="${o.siteName}"/>
    <meta property="og:locale" content="${o.locale}"/>
    <meta property="og:type" content="${o.type}"/>
    </head><body>${body}</body></html>`;
}

const rules = (pages: Map<string, string>) =>
  checkPages(pages).map(v => v.rule);

// ── parsePageSeo ─────────────────────────────────────────────────────────────

test('parsePageSeo: title / description / canonical / og를 뽑는다', () => {
  const seo = parsePageSeo(page());
  assert.equal(seo.title, '짧은 제목 | Frontend Lab');
  assert.equal(seo.canonical, `${SITE_URL}/posts/a/`);
  assert.equal(seo.ogSiteName, 'Frontend Lab');
  assert.equal(seo.ogLocale, 'ko_KR');
  assert.equal(seo.ogType, 'article');
  assert.equal(seo.h1Count, 1);
});

test('parsePageSeo: head의 JSON-LD 안에 있는 "h1" 문자열은 세지 않는다', () => {
  // BlogPosting의 speakable.cssSelector에 "h1"이 들어 있어서, body를 자르지 않으면
  // 모든 글이 h1 2개로 잡힌다.
  const html = `<!doctype html><html><head>
    <script type="application/ld+json">{"speakable":{"cssSelector":["h1","h2:first-of-type"]}}</script>
    </head><body><h1>제목</h1></body></html>`;
  assert.equal(parsePageSeo(html).h1Count, 1);
});

test('parsePageSeo: content가 앞에 오는 meta도 읽는다', () => {
  const html =
    '<head><meta content="ko_KR" property="og:locale"/></head><body></body>';
  assert.equal(parsePageSeo(html).ogLocale, 'ko_KR');
});

test('parsePageSeo: alt 속성이 아예 없는 img만 센다', () => {
  // `alt=""`는 장식용 이미지의 올바른 마크업이라 위반이 아니다.
  const html = page(
    {},
    '<h1>t</h1><img src="a.png"/><img src="b.png" alt=""/><img src="c.png" alt="설명"/>',
  );
  assert.equal(parsePageSeo(html).imagesMissingAlt, 1);
});

// ── checkPages ───────────────────────────────────────────────────────────────

test('checkPages: 정상 페이지는 위반 없음', () => {
  assert.deepEqual(rules(new Map([['/posts/a/', page()]])), []);
});

test('checkPages: h1이 0개거나 2개면 h1-count', () => {
  assert.ok(
    rules(new Map([['/posts/a/', page({}, '<p>본문</p>')]])).includes(
      'h1-count',
    ),
  );
  assert.ok(
    rules(
      new Map([['/posts/a/', page({}, '<h1>제목</h1><h1>또 제목</h1>')]]),
    ).includes('h1-count'),
  );
});

test('checkPages: 60자 넘는 <title>은 title-length', () => {
  const long = `${'가'.repeat(50)} | Frontend Lab`;
  assert.ok(
    rules(new Map([['/posts/a/', page({ title: long })]])).includes(
      'title-length',
    ),
  );
});

test('checkPages: 말줄임으로 끝나는 description은 truncated-description', () => {
  // 본문 앞 160자 자동 발췌가 그대로 나간 경우 — 도입부가 비슷한 글끼리 겹친다.
  const desc = `${'가'.repeat(127)}...`;
  assert.ok(
    rules(new Map([['/posts/a/', page({ description: desc })]])).includes(
      'truncated-description',
    ),
  );
});

test('checkPages: description이 서로 완전히 같으면 duplicate-description', () => {
  const same = '나'.repeat(130);
  const found = rules(
    new Map([
      [
        '/posts/a/',
        page({ description: same, canonical: `${SITE_URL}/posts/a/` }),
      ],
      [
        '/posts/b/',
        page({ description: same, canonical: `${SITE_URL}/posts/b/` }),
      ],
    ]),
  );
  assert.ok(found.includes('duplicate-description'));
});

test('checkPages: canonical이 자기 URL과 다르면 canonical-mismatch', () => {
  assert.ok(
    rules(
      new Map([
        ['/posts/a/', page({ canonical: `${SITE_URL}/posts/다른글/` })],
      ]),
    ).includes('canonical-mismatch'),
  );
});

test('checkPages: og:site_name이 다른 페이지를 잡는다', () => {
  // 감사에서 실제로 나온 문제 — 글은 'Frontend Lab Blog', 홈은 'Frontend Lab'.
  // 페이지끼리 비교하는 집계 규칙 대신, 각 페이지를 기대값과 직접 비교한다
  // (집계 규칙은 이 규칙에 완전히 포섭돼 한 결함이 두 번 보고됐다).
  const found = rules(
    new Map([
      ['/posts/a/', page({ canonical: `${SITE_URL}/posts/a/` })],
      [
        '/posts/b/',
        page({
          siteName: 'Frontend Lab Blog',
          canonical: `${SITE_URL}/posts/b/`,
          // 두 페이지의 description이 같으면 duplicate-description까지 섞인다.
          description: '나'.repeat(130),
        }),
      ],
    ]),
  );
  assert.deepEqual(found, ['unexpected-og-site-name']);
});

test('checkPages: og:locale 누락을 잡는다', () => {
  const html = page().replace(/<meta property="og:locale"[^>]*>/, '');
  assert.ok(
    rules(new Map([['/posts/a/', html]])).includes('missing-og-locale'),
  );
});

test('checkPages: og:type 누락을 잡는다', () => {
  // locale과 한 테스트에 묶여 있어서 og:type 규칙만 회귀해도 아무도 몰랐다.
  const html = page().replace(/<meta property="og:type"[^>]*>/, '');
  assert.ok(rules(new Map([['/posts/a/', html]])).includes('missing-og-type'));
});

test('checkPages: noindex 페이지는 검사하지 않는다', () => {
  // /admin, /privacy, /preview 플레이스홀더는 검색 대상이 아니다.
  const html = `<head><meta name="robots" content="noindex, nofollow"/></head><body></body>`;
  assert.deepEqual(rules(new Map([['/admin/', html]])), []);
});

// ── checkFeeds ───────────────────────────────────────────────────────────────

const sitemapXml = (slugs: string[]) =>
  `<urlset><url><loc>${SITE_URL}/</loc></url><url><loc>${SITE_URL}/posts/</loc></url>${slugs
    .map(s => `<url><loc>${SITE_URL}/posts/${s}/</loc></url>`)
    .join('')}</urlset>`;
const rssXml = (slugs: string[]) =>
  slugs
    .map(
      s =>
        `<item><guid isPermaLink="true">${SITE_URL}/posts/${s}/</guid></item>`,
    )
    .join('');
const llmsTxt = (slugs: string[]) =>
  slugs.map(s => `- [글](${SITE_URL}/posts/${s}/): 요약`).join('\n');

test('checkFeeds: 세 산출물의 글 집합이 같으면 위반 없음', () => {
  const slugs = ['a', 'b', 'c'];
  assert.deepEqual(
    checkFeeds(sitemapXml(slugs), rssXml(slugs), llmsTxt(slugs)),
    [],
  );
});

test('checkFeeds: llms.txt에 빠진 글을 잡는다 (손으로 관리하다 6편 누락됐던 회귀)', () => {
  const found = checkFeeds(
    sitemapXml(['a', 'b', 'c']),
    rssXml(['a', 'b', 'c']),
    llmsTxt(['a']),
  );
  assert.ok(found.some(v => v.rule === 'feed-missing-posts'));
});

test('checkFeeds: 아카이브 목록(/posts/)은 글로 세지 않는다', () => {
  // sitemap에는 있고 rss에는 없는 게 정상 — 이걸 글로 세면 항상 실패한다.
  assert.deepEqual(
    checkFeeds(sitemapXml(['a']), rssXml(['a']), llmsTxt(['a'])),
    [],
  );
});

test('checkFeeds: RSS 본문(content:encoded)의 링크는 글로 세지 않는다', () => {
  // 본문에 다른 글 링크나 이미지 경로(/posts/시리즈/img/…)가 들어 있어도 오탐하면 안 된다.
  const rss = `${rssXml(['a'])}<item><description><![CDATA[<a href="${SITE_URL}/posts/딴글/">링크</a><img src="${SITE_URL}/posts/시리즈/img/x.png"/>]]></description></item>`;
  assert.deepEqual(checkFeeds(sitemapXml(['a']), rss, llmsTxt(['a'])), []);
});

test('checkFeeds: 한글 slug는 인코딩 차이로 오탐하지 않는다', () => {
  const encoded = `<urlset><url><loc>${SITE_URL}/posts/${encodeURIComponent('한글')}/</loc></url></urlset>`;
  const raw = `<item><guid>${SITE_URL}/posts/한글/</guid></item>`;
  assert.deepEqual(
    checkFeeds(encoded, raw, `- [글](${SITE_URL}/posts/한글/): 요약`),
    [],
  );
});

test('checkPages: canonical은 퍼센트 인코딩을 풀어 비교한다 (한글 slug)', () => {
  // out/의 디렉토리 이름은 `/posts/한글/`인데 canonical은 인코딩된 URL이다.
  // 디코드하지 않으면 한글 slug 글이 하나만 생겨도 배포가 막힌다.
  const encoded = `${SITE_URL}/posts/${encodeURIComponent('한글')}/`;
  assert.deepEqual(
    rules(new Map([['/posts/한글/', page({ canonical: encoded })]])),
    [],
  );
});

test('checkPages: 인코딩을 풀어도 다르면 여전히 canonical-mismatch', () => {
  assert.ok(
    rules(
      new Map([
        ['/posts/한글/', page({ canonical: `${SITE_URL}/posts/다른글/` })],
      ]),
    ).includes('canonical-mismatch'),
  );
});

test('checkPages: 장식용 alt=""는 위반이 아니다', () => {
  // 홈의 FeaturedPost는 제목 바로 옆 썸네일이라 의도적으로 alt=""를 쓴다.
  // 이걸 잡으면 손수 썸네일을 지정한 글이 최신 글이 되는 순간, frontmatter로는
  // 고칠 수 없는 이유로 배포가 막힌다.
  assert.deepEqual(
    rules(
      new Map([['/posts/a/', page({}, '<h1>t</h1><img src="a.png" alt=""/>')]]),
    ),
    [],
  );
});

test('checkPages: alt 속성이 아예 없으면 missing-img-alt', () => {
  assert.ok(
    rules(
      new Map([['/posts/a/', page({}, '<h1>t</h1><img src="a.png"/>')]]),
    ).includes('missing-img-alt'),
  );
});

test('parsePageSeo: alt 안의 `>`에서 태그가 끊기지 않는다', () => {
  // `alt="22분 > 8분"` 같은 부등호. `[^>]*`로 읽으면 alt가 없는 것처럼 보인다.
  const html = page({}, '<h1>t</h1><img src="a.png" alt="22분 > 8분"/>');
  assert.equal(parsePageSeo(html).imagesMissingAlt, 0);
});

test('checkPages: og:site_name이 사이트 이름과 다르면 잡는다', () => {
  // 페이지끼리만 비교하면, 모두 같은 상수를 쓰는 지금은 규칙이 영영 발동하지 않는다.
  assert.ok(
    rules(
      new Map([['/posts/a/', page({ siteName: 'Frontend Lab Blog' })]]),
    ).includes('unexpected-og-site-name'),
  );
});

test('checkPages: 한 페이지만 달라도 잡는다 (다수결이 아니다)', () => {
  const found = rules(
    new Map([
      ['/posts/a/', page({ canonical: `${SITE_URL}/posts/a/` })],
      [
        '/posts/b/',
        page({
          canonical: `${SITE_URL}/posts/b/`,
          description: '나'.repeat(130),
        }),
      ],
      [
        '/posts/c/',
        page({
          siteName: '다른 이름',
          canonical: `${SITE_URL}/posts/c/`,
          description: '다'.repeat(130),
        }),
      ],
    ]),
  );
  assert.ok(found.includes('unexpected-og-site-name'));
});
