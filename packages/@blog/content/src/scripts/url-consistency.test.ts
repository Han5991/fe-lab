import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSitemapXml } from './generate-sitemap';
import { buildRssXml } from './render/generate-rss';
import { buildLlmsText } from './generate-llms';
import { buildLlmsFullText } from './generate-llms-full';
import { postPath, postUrl } from '../post/urls';
import type { PostData } from '../post';

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
  assert.equal(expected, `${SITE}${postPath(SLUG)}`);

  const artifacts: [string, string][] = [
    ['sitemap.xml', buildSitemapXml([post], '2026-01-02', SITE)],
    ['rss.xml', buildRssXml([post], { siteUrl: SITE, now: new Date(0) })],
    [
      'llms.txt',
      buildLlmsText([post], { siteUrl: SITE, resolveSeriesMeta: () => null }),
    ],
    ['llms-full.txt', buildLlmsFullText([post], { siteUrl: SITE })],
  ];

  for (const [name, text] of artifacts) {
    assert.ok(
      text.includes(expected),
      `${name}에 인코딩된 URL(${expected})이 없습니다`,
    );
    assert.ok(
      !text.includes(`${SITE}/posts/${SLUG}/`),
      `${name}에 인코딩되지 않은 URL이 남아 있습니다`,
    );
  }
});
