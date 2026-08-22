import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import {
  parsePageSeo,
  checkPages,
  checkArtifacts,
  collectArtifacts,
  type CollectedArtifact,
} from './check-seo.ts';
import { TEST_VALUES, defineTestContent } from '../shared/testValues.ts';
import { sep } from 'node:path';

// 사이트 이름·origin·SEO 예산은 설정에서 온다 — 이 게이트가 읽는 슬라이스도 그것.
const CONFIG = defineTestContent({ root: `${sep}tmp${sep}app` });
const SITE_URL = TEST_VALUES.site.url;
const SITE_NAME = TEST_VALUES.site.name;

/** 위반이 하나도 없는 최소 페이지 — 각 테스트는 여기서 한 가지만 망가뜨린다. */
function page(
  over: Partial<Record<string, string>> = {},
  body = '<h1>제목</h1>',
) {
  const o = {
    path: '/posts/a/',
    title: `짧은 제목${CONFIG.seo.titleSuffix}`,
    description: '가'.repeat(130),
    canonical: `${SITE_URL}/posts/a/`,
    siteName: SITE_NAME,
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
  checkPages(pages, CONFIG).map(v => v.rule);

// ── parsePageSeo ─────────────────────────────────────────────────────────────

test('parsePageSeo: title / description / canonical / og를 뽑는다', () => {
  const seo = parsePageSeo(page());
  expect(seo.title).toBe(`짧은 제목${CONFIG.seo.titleSuffix}`);
  expect(seo.canonical).toBe(`${SITE_URL}/posts/a/`);
  expect(seo.ogSiteName).toBe(SITE_NAME);
  expect(seo.ogLocale).toBe('ko_KR');
  expect(seo.ogType).toBe('article');
  expect(seo.h1Count).toBe(1);
});

test('parsePageSeo: head의 JSON-LD 안에 있는 "h1" 문자열은 세지 않는다', () => {
  // BlogPosting의 speakable.cssSelector에 "h1"이 들어 있어서, body를 자르지 않으면
  // 모든 글이 h1 2개로 잡힌다.
  const html = `<!doctype html><html><head>
    <script type="application/ld+json">{"speakable":{"cssSelector":["h1","h2:first-of-type"]}}</script>
    </head><body><h1>제목</h1></body></html>`;
  expect(parsePageSeo(html).h1Count).toBe(1);
});

test('parsePageSeo: content가 앞에 오는 meta도 읽는다', () => {
  const html =
    '<head><meta content="ko_KR" property="og:locale"/></head><body></body>';
  expect(parsePageSeo(html).ogLocale).toBe('ko_KR');
});

test('parsePageSeo: alt 속성이 아예 없는 img만 센다', () => {
  // `alt=""`는 장식용 이미지의 올바른 마크업이라 위반이 아니다.
  const html = page(
    {},
    '<h1>t</h1><img src="a.png"/><img src="b.png" alt=""/><img src="c.png" alt="설명"/>',
  );
  expect(parsePageSeo(html).imagesMissingAlt).toBe(1);
});

// ── checkPages ───────────────────────────────────────────────────────────────

test('checkPages: 정상 페이지는 위반 없음', () => {
  expect(rules(new Map([['/posts/a/', page()]]))).toStrictEqual([]);
});

test('checkPages: h1이 0개거나 2개면 h1-count', () => {
  expect(
    rules(new Map([['/posts/a/', page({}, '<p>본문</p>')]])).includes(
      'h1-count',
    ),
  ).toBeTruthy();
  expect(
    rules(
      new Map([['/posts/a/', page({}, '<h1>제목</h1><h1>또 제목</h1>')]]),
    ).includes('h1-count'),
  ).toBeTruthy();
});

test('checkPages: 60자 넘는 <title>은 title-length', () => {
  const long = `${'가'.repeat(50)} | Frontend Lab`;
  expect(
    rules(new Map([['/posts/a/', page({ title: long })]])).includes(
      'title-length',
    ),
  ).toBeTruthy();
});

test('checkPages: 말줄임으로 끝나는 description은 truncated-description', () => {
  // 본문 앞 160자 자동 발췌가 그대로 나간 경우 — 도입부가 비슷한 글끼리 겹친다.
  const desc = `${'가'.repeat(127)}...`;
  expect(
    rules(new Map([['/posts/a/', page({ description: desc })]])).includes(
      'truncated-description',
    ),
  ).toBeTruthy();
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
  expect(found.includes('duplicate-description')).toBeTruthy();
});

test('checkPages: canonical이 자기 URL과 다르면 canonical-mismatch', () => {
  expect(
    rules(
      new Map([
        ['/posts/a/', page({ canonical: `${SITE_URL}/posts/다른글/` })],
      ]),
    ).includes('canonical-mismatch'),
  ).toBeTruthy();
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
  expect(found).toStrictEqual(['unexpected-og-site-name']);
});

test('checkPages: og:locale 누락을 잡는다', () => {
  const html = page().replace(/<meta property="og:locale"[^>]*>/, '');
  expect(
    rules(new Map([['/posts/a/', html]])).includes('missing-og-locale'),
  ).toBeTruthy();
});

test('checkPages: og:type 누락을 잡는다', () => {
  // locale과 한 테스트에 묶여 있어서 og:type 규칙만 회귀해도 아무도 몰랐다.
  const html = page().replace(/<meta property="og:type"[^>]*>/, '');
  expect(
    rules(new Map([['/posts/a/', html]])).includes('missing-og-type'),
  ).toBeTruthy();
});

test('checkPages: noindex 페이지는 검사하지 않는다', () => {
  // /admin, /privacy는 검색 대상이 아니다.
  const html = `<head><meta name="robots" content="noindex, nofollow"/></head><body></body>`;
  expect(rules(new Map([['/admin/', html]]))).toStrictEqual([]);
});

// ── link-trailing-slash ──────────────────────────────────────────────────────
// next/link는 trailingSlash: true에서도 마지막 세그먼트에 `.`이 있는 경로를 파일로
// 보고 후행 슬래시를 벗긴다. 2026-08-17 스택 3 검증에서 `/posts/` 아카이브 링크
// 44개 중 `/posts/turborepo-next.js-docker` 하나만 슬래시가 없는 채 나갔다 —
// next.config.ts의 skipTrailingSlashRedirect가 근본 수정이고, 이 규칙이 그 회귀 잠금.

/** 링크 대상 페이지 `/posts/turborepo-next.js-docker/`가 함께 존재하는 사이트 */
const siteWithDottedPost = (archiveBody: string) =>
  new Map([
    [
      '/posts/',
      page({ path: '/posts/', canonical: `${SITE_URL}/posts/` }, archiveBody),
    ],
    [
      '/posts/turborepo-next.js-docker/',
      page({
        canonical: `${SITE_URL}/posts/turborepo-next.js-docker/`,
        description: '나'.repeat(130),
      }),
    ],
  ]);

test('checkPages: 존재하는 페이지로 가는 내부 링크에 후행 슬래시가 없으면 link-trailing-slash (turborepo-next.js-docker 회귀)', () => {
  const found = checkPages(
    siteWithDottedPost(
      '<h1>글</h1><a href="/posts/turborepo-next.js-docker">turborepo</a>',
    ),
    CONFIG,
  );
  expect(found.map(v => [v.page, v.rule])).toStrictEqual([
    ['/posts/', 'link-trailing-slash'],
  ]);
  expect(found.map(v => v.message).join('\n')).toMatch(
    /\/posts\/turborepo-next\.js-docker\//,
  );
});

test('checkPages: 후행 슬래시가 있으면 `.`이 든 slug라도 통과한다', () => {
  expect(
    rules(
      siteWithDottedPost(
        '<h1>글</h1><a href="/posts/turborepo-next.js-docker/">turborepo</a>',
      ),
    ),
  ).toStrictEqual([]);
});

test('checkPages: 쿼리·해시 앞의 경로로 판정한다', () => {
  expect(
    rules(
      siteWithDottedPost(
        '<h1>글</h1><a href="/posts/turborepo-next.js-docker?ref=x">a</a>' +
          '<a href="/posts/turborepo-next.js-docker#top">b</a>' +
          '<a href="/posts/?tag=a&amp;series=b">c</a>',
      ),
    ),
  ).toStrictEqual(['link-trailing-slash', 'link-trailing-slash']);
});

test('checkPages: 파일 링크(/rss.xml)·외부·프로토콜 상대·해시 전용 링크는 보지 않는다', () => {
  expect(
    rules(
      siteWithDottedPost(
        '<h1>글</h1><a href="/rss.xml">rss</a>' +
          '<a href="https://example.com/posts/turborepo-next.js-docker">x</a>' +
          '<a href="//example.com/posts/turborepo-next.js-docker">y</a>' +
          '<a href="#top">z</a>' +
          '<a href="/posts/no-such-page">없는 페이지는 이 규칙의 대상이 아니다</a>',
      ),
    ),
  ).toStrictEqual([]);
});

test('checkPages: 인코딩된 href도 디코드해 페이지와 대조한다 (한글 slug)', () => {
  const pages = new Map([
    [
      '/posts/',
      page(
        { path: '/posts/', canonical: `${SITE_URL}/posts/` },
        `<h1>글</h1><a href="/posts/${encodeURIComponent('한글.글')}">a</a>`,
      ),
    ],
    [
      '/posts/한글.글/',
      page({
        canonical: `${SITE_URL}/posts/${encodeURIComponent('한글.글')}/`,
        description: '나'.repeat(130),
      }),
    ],
  ]);
  expect(rules(pages)).toStrictEqual(['link-trailing-slash']);
});

test('checkPages: noindex 페이지의 내부 링크도 본다 (색인이 아니라 내비게이션 문제)', () => {
  const pages = new Map([
    [
      '/admin/',
      `<head><meta name="robots" content="noindex, nofollow"/></head>` +
        `<body><a href="/admin/analytics">통계</a></body>`,
    ],
    [
      '/admin/analytics/',
      `<head><meta name="robots" content="noindex, nofollow"/></head><body></body>`,
    ],
  ]);
  expect(rules(pages)).toStrictEqual(['link-trailing-slash']);
});

// ── checkArtifacts ───────────────────────────────────────────────────────────
// 산출물 형식별 URL **추출**은 레지스트리 쪽 테스트(artifacts.test.ts)가 잠그고,
// 여기서는 수집 결과(집합)의 **대조 규칙**(exact/subset/superset)을 잠근다.

const urls = (slugs: string[]) =>
  new Set(slugs.map(s => `${SITE_URL}/posts/${s}/`));

const collected = (
  over: Partial<CollectedArtifact> = {},
): CollectedArtifact => ({
  name: 'rss.xml',
  relation: 'exact',
  urls: urls(['a', 'b']),
  ...over,
});

const reference = (slugs: string[]): CollectedArtifact =>
  collected({ name: 'sitemap.xml', reference: true, urls: urls(slugs) });

test('checkArtifacts: 모든 산출물의 글 집합이 기준과 같으면 위반 없음', () => {
  expect(checkArtifacts([reference(['a', 'b']), collected()])).toStrictEqual(
    [],
  );
});

test('checkArtifacts: exact 산출물에서 글이 빠지면 artifact-missing-posts (손으로 관리하다 6편 누락됐던 회귀)', () => {
  const found = checkArtifacts([
    reference(['a', 'b', 'c']),
    collected({ name: 'llms.txt', urls: urls(['a']) }),
  ]);
  expect(found.some(v => v.rule === 'artifact-missing-posts')).toBeTruthy();
});

test('checkArtifacts: exact 산출물에 기준에 없는 글이 있으면 artifact-extra-posts', () => {
  const found = checkArtifacts([
    reference(['a']),
    collected({ urls: urls(['a', '유령글']) }),
  ]);
  expect(found.map(v => v.rule)).toStrictEqual(['artifact-extra-posts']);
});

test('checkArtifacts: subset(og 이미지)은 덜 담는 것이 정상 — missing을 보지 않는다', () => {
  // og 카드는 thumbnail이 없는 글만 생성한다. exact로 보면 손수 썸네일을
  // 지정한 글마다 위반이 떠서 게이트가 항상 실패한다.
  expect(
    checkArtifacts([
      reference(['a', 'b', 'c']),
      collected({ name: 'og 이미지', relation: 'subset', urls: urls(['a']) }),
    ]),
  ).toStrictEqual([]);
});

test('checkArtifacts: subset이라도 기준에 없는 잔여물은 artifact-extra-posts', () => {
  // 삭제/이름변경된 글의 og 이미지가 남아 있는 경우.
  const found = checkArtifacts([
    reference(['a']),
    collected({
      name: 'og 이미지',
      relation: 'subset',
      urls: urls(['a', '지운글']),
    }),
  ]);
  expect(found.map(v => v.rule)).toStrictEqual(['artifact-extra-posts']);
});

test('checkArtifacts: superset(admin 인덱스)은 hidden 글이 더 있어도 위반이 아니다', () => {
  expect(
    checkArtifacts([
      reference(['a']),
      collected({
        name: 'admin-posts-index.json',
        relation: 'superset',
        urls: urls(['a', '초안글']),
      }),
    ]),
  ).toStrictEqual([]);
});

test('checkArtifacts: superset이라도 발행 글이 빠지면 artifact-missing-posts', () => {
  const found = checkArtifacts([
    reference(['a', 'b']),
    collected({
      name: 'admin-posts-index.json',
      relation: 'superset',
      urls: urls(['a', '초안글']),
    }),
  ]);
  expect(found.map(v => v.rule)).toStrictEqual(['artifact-missing-posts']);
});

test('checkArtifacts: 산출물이 없으면(missing-artifact) 그 산출물만 보고하고 나머지는 계속 대조한다', () => {
  const found = checkArtifacts([
    reference(['a', 'b']),
    collected({ name: 'llms-full.txt', urls: null }),
    collected({ name: 'rss.xml', urls: urls(['a']) }),
  ]);
  expect(found.map(v => v.rule)).toStrictEqual([
    'missing-artifact',
    'artifact-missing-posts',
  ]);
});

test('checkArtifacts: 기준(sitemap)이 없으면 대조를 걸지 않는다', () => {
  // 기준 부재를 다른 산출물들의 missing-posts 수십 건으로 둔갑시키지 않는다.
  const found = checkArtifacts([
    collected({ name: 'sitemap.xml', reference: true, urls: null }),
    collected(),
  ]);
  expect(found.map(v => v.rule)).toStrictEqual(['missing-artifact']);
});

test('checkArtifacts: 인코딩 차이는 수집(추출) 단계에서 디코드 정규화돼 오탐하지 않는다', () => {
  // 추출기가 decodeUrlSafe로 정규화한 집합을 넘긴다는 전제의 확인 —
  // 실제 추출 정규화는 artifacts.test.ts가 잠근다.
  const encoded = new Set([`${SITE_URL}/posts/한글/`]);
  expect(
    checkArtifacts([
      collected({ name: 'sitemap.xml', reference: true, urls: encoded }),
      collected({ urls: new Set([`${SITE_URL}/posts/한글/`]) }),
    ]),
  ).toStrictEqual([]);
});

// ── collectArtifacts + checkArtifacts 통합 (실제 게이트 경로) ────────────────

/** 레지스트리의 모든 산출물이 갖춰진 최소 out/ 픽스처를 만든다. */
function writeFixtureOut(dir: string, slugs: string[]) {
  const sitemap = `<urlset><url><loc>${SITE_URL}/</loc></url><url><loc>${SITE_URL}/posts/</loc></url>${slugs
    .map(s => `<url><loc>${SITE_URL}/posts/${s}/</loc></url>`)
    .join('')}</urlset>`;
  const rss = slugs
    .map(
      s =>
        `<item><guid isPermaLink="true">${SITE_URL}/posts/${s}/</guid></item>`,
    )
    .join('');
  const llms = slugs
    .map(s => `- [글](${SITE_URL}/posts/${s}/): 요약`)
    .join('\n');
  const llmsFull = slugs
    .map(s => `### [글](${SITE_URL}/posts/${s}/) (2026-01-01)`)
    .join('\n');
  const index = JSON.stringify(slugs.map(s => ({ slug: s })));
  writeFileSync(join(dir, 'sitemap.xml'), sitemap);
  writeFileSync(join(dir, 'rss.xml'), rss);
  writeFileSync(join(dir, 'llms.txt'), llms);
  writeFileSync(join(dir, 'llms-full.txt'), llmsFull);
  writeFileSync(join(dir, 'search-index.json'), index);
  writeFileSync(join(dir, 'admin-posts-index.json'), index);
  mkdirSync(join(dir, 'og'), { recursive: true });
  for (const s of slugs) writeFileSync(join(dir, 'og', `${s}.png`), '');
}

test('게이트 통합: 온전한 픽스처는 통과하고, 한 산출물에서 글 하나를 빼면 실제로 실패한다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'check-seo-artifacts-'));
  try {
    writeFixtureOut(dir, ['a', 'b']);
    expect(checkArtifacts(collectArtifacts(dir, SITE_URL))).toStrictEqual([]);

    // rss.xml에서만 글 b를 뺀다 → 게이트가 잡아야 한다.
    writeFileSync(
      join(dir, 'rss.xml'),
      `<item><guid isPermaLink="true">${SITE_URL}/posts/a/</guid></item>`,
    );
    const found = checkArtifacts(collectArtifacts(dir, SITE_URL));
    expect(found.map(v => [v.page, v.rule])).toStrictEqual([
      ['rss.xml', 'artifact-missing-posts'],
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('게이트 통합: 레지스트리 산출물이 파일째 없으면 missing-artifact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'check-seo-artifacts-'));
  try {
    writeFixtureOut(dir, ['a']);
    rmSync(join(dir, 'llms-full.txt'));
    const found = checkArtifacts(collectArtifacts(dir, SITE_URL));
    expect(found.map(v => [v.page, v.rule])).toStrictEqual([
      ['llms-full.txt', 'missing-artifact'],
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkPages: canonical은 퍼센트 인코딩을 풀어 비교한다 (한글 slug)', () => {
  // out/의 디렉토리 이름은 `/posts/한글/`인데 canonical은 인코딩된 URL이다.
  // 디코드하지 않으면 한글 slug 글이 하나만 생겨도 배포가 막힌다.
  const encoded = `${SITE_URL}/posts/${encodeURIComponent('한글')}/`;
  expect(
    rules(new Map([['/posts/한글/', page({ canonical: encoded })]])),
  ).toStrictEqual([]);
});

test('checkPages: 인코딩을 풀어도 다르면 여전히 canonical-mismatch', () => {
  expect(
    rules(
      new Map([
        ['/posts/한글/', page({ canonical: `${SITE_URL}/posts/다른글/` })],
      ]),
    ).includes('canonical-mismatch'),
  ).toBeTruthy();
});

test('checkPages: 장식용 alt=""는 위반이 아니다', () => {
  // 홈의 FeaturedPost는 제목 바로 옆 썸네일이라 의도적으로 alt=""를 쓴다.
  // 이걸 잡으면 손수 썸네일을 지정한 글이 최신 글이 되는 순간, frontmatter로는
  // 고칠 수 없는 이유로 배포가 막힌다.
  expect(
    rules(
      new Map([['/posts/a/', page({}, '<h1>t</h1><img src="a.png" alt=""/>')]]),
    ),
  ).toStrictEqual([]);
});

test('checkPages: alt 속성이 아예 없으면 missing-img-alt', () => {
  expect(
    rules(
      new Map([['/posts/a/', page({}, '<h1>t</h1><img src="a.png"/>')]]),
    ).includes('missing-img-alt'),
  ).toBeTruthy();
});

test('parsePageSeo: alt 안의 `>`에서 태그가 끊기지 않는다', () => {
  // `alt="22분 > 8분"` 같은 부등호. `[^>]*`로 읽으면 alt가 없는 것처럼 보인다.
  const html = page({}, '<h1>t</h1><img src="a.png" alt="22분 > 8분"/>');
  expect(parsePageSeo(html).imagesMissingAlt).toBe(0);
});

test('checkPages: og:site_name이 사이트 이름과 다르면 잡는다', () => {
  // 페이지끼리만 비교하면, 모두 같은 상수를 쓰는 지금은 규칙이 영영 발동하지 않는다.
  expect(
    rules(
      new Map([['/posts/a/', page({ siteName: 'Frontend Lab Blog' })]]),
    ).includes('unexpected-og-site-name'),
  ).toBeTruthy();
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
  expect(found.includes('unexpected-og-site-name')).toBeTruthy();
});
