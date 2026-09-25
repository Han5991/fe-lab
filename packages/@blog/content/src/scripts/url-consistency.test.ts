import { expect, test } from 'vitest';
import { buildSitemapXml } from './generate-sitemap.ts';
import { buildRssXml } from './generate-rss.ts';
import { buildLlmsText } from './generate-llms.ts';
import { buildLlmsFullText } from './generate-llms-full.ts';
import { postPath, postUrl } from '../post/urls.ts';
import type { PostData } from '../post/index.ts';
import { decodeUrlSafe } from '../shared/url.ts';
import { ARTIFACTS } from './artifacts.ts';
import { defineTestContent } from '../shared/testValues.ts';
import { sep } from 'node:path';

/**
 * PR `contract/url`의 핵심 계약: 비ASCII slug가 **다섯 산출 지점**
 * (sitemap.xml · rss.xml · llms.txt · llms-full.txt · 페이지 링크)에서
 * 모두 같은 인코딩의 URL로 나온다.
 *
 * 이 계약이 없던 시절 실제로 llms-full.txt만 인코딩이 빠져 있었다 — 발행 글
 * slug가 전부 ASCII라 무증상이었을 뿐, `--slug` 없이 `new-post`를 쓰면 한글
 * 파일명이 곧 slug가 되므로 언제든 재현되는 드리프트였다. 생성기들이 URL을
 * 각자 조립하는 한 같은 회귀는 언제든 돌아올 수 있어, 여기서 네 생성기의
 * 출력을 실제로 만들어 대조한다.
 */

const SITE = 'https://example.dev';
// 생성기가 읽는 값은 전부 설정에서 온다 — 산출물 4종이 같은 값을 봐야 URL이 일치한다.
const CONFIG = defineTestContent({ root: `${sep}tmp${sep}app` });
const SITE_VALUES = { ...CONFIG.site, url: SITE };
const TZ = CONFIG.timezone;
const SLUG = '한글/글 제목';

function makePost(over: Partial<PostData> = {}): PostData {
  return {
    slug: SLUG,
    originalSlug: SLUG,
    relativeDir: '한글',
    title: '한글 제목 글',
    date: '2026-01-01',
    content: '본문',
    readMin: 1,
    excerpt: '요약',
    status: 'published',
    ...over,
  };
}

test('비ASCII slug: 다섯 산출 지점이 모두 같은 인코딩의 URL을 낸다', () => {
  const post = makePost();
  // 기준은 페이지 링크와 같은 규칙(postPath)에서 온 절대 URL.
  const expected = postUrl(SLUG, SITE);
  expect(expected).toBe(`${SITE}${postPath(SLUG)}`);

  const artifacts: [string, string][] = [
    [
      'sitemap.xml',
      buildSitemapXml([post], '2026-01-02', SITE_VALUES, TZ, CONFIG.sitemap),
    ],
    [
      'rss.xml',
      buildRssXml([post], {
        site: SITE_VALUES,
        timezone: TZ,
        now: new Date(0),
      }),
    ],
    [
      'llms.txt',
      buildLlmsText([post], {
        site: SITE_VALUES,
        llms: CONFIG.llms,
        author: CONFIG.author,
        resolveSeriesMeta: () => null,
      }),
    ],
    [
      'llms-full.txt',
      buildLlmsFullText([post], {
        site: SITE_VALUES,
        author: CONFIG.author,
        llms: CONFIG.llms,
        resolveSeriesMeta: () => null,
      }),
    ],
  ];

  for (const [name, text] of artifacts) {
    expect(
      text.includes(expected),
      `${name}에 인코딩된 URL(${expected})이 없습니다`,
    ).toBeTruthy();
    expect(
      !text.includes(`${SITE}/posts/${SLUG}/`),
      `${name}에 인코딩되지 않은 URL이 남아 있습니다`,
    ).toBeTruthy();
  }
});

/**
 * 괄호가 든 slug — `encodeURIComponent`는 `( )`를 인코딩하지 않는다. 산출물의
 * 링크 추출(artifacts.ts)이 첫 `)`에서 끊던 때는 멀쩡한 글이 llms 두 파일에서
 * "없는 글"이자 "있는 글"로 동시에 보고돼 배포가 막혔다. 추출까지 실제
 * 레지스트리로 돌려, 산출물마다 **같은 글 URL 하나**가 나오는지 본다.
 */
test.each([
  [
    '짝이 맞는 괄호',
    'pnpm 10 업그레이드 후 ESLint 설정이 사라졌어요?! (feat. 호이스팅)',
  ],
  ['짝이 안 맞는 괄호', '웃는 얼굴 :)'],
])(
  '괄호가 든 slug(%s): 산출물마다 추출한 글 URL이 sitemap과 같다',
  (_, slug) => {
    const post = makePost({ slug, originalSlug: slug, relativeDir: '' });
    const texts = new Map<string, string>([
      [
        'sitemap.xml',
        buildSitemapXml([post], '2026-01-02', SITE_VALUES, TZ, CONFIG.sitemap),
      ],
      [
        'rss.xml',
        buildRssXml([post], {
          site: SITE_VALUES,
          timezone: TZ,
          now: new Date(0),
        }),
      ],
      [
        'llms.txt',
        buildLlmsText([post], {
          site: SITE_VALUES,
          llms: CONFIG.llms,
          author: CONFIG.author,
          resolveSeriesMeta: () => null,
        }),
      ],
      [
        'llms-full.txt',
        buildLlmsFullText([post], {
          site: SITE_VALUES,
          author: CONFIG.author,
          llms: CONFIG.llms,
          resolveSeriesMeta: () => null,
        }),
      ],
    ]);
    const expected = decodeUrlSafe(postUrl(slug, SITE));

    for (const spec of ARTIFACTS) {
      const text = texts.get(spec.name);
      if (spec.kind !== 'file' || text === undefined) continue;
      expect([...spec.extractUrls(text, SITE)], spec.name).toStrictEqual([
        expected,
      ]);
      texts.delete(spec.name);
    }
    expect([...texts.keys()], '레지스트리가 읽지 않은 산출물').toStrictEqual(
      [],
    );
  },
);
