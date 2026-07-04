import { describe, expect, test } from 'vitest';
// Next가 리디렉션을 실제로 매칭/컴파일할 때 쓰는 내부 유틸을 그대로 사용해
// next.config 리디렉션 규칙의 동작을 잠근다. 과거 파일 경로에 후행 슬래시가
// 붙어 sitemap.xml이 6개월간 404였던 회귀(Search Console 색인 실패)를 방지.
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';
import nextConfig from './next.config';

async function resolveRedirect(pathname: string): Promise<string | null> {
  const redirects = await nextConfig.redirects!();
  for (const rule of redirects) {
    const matcher = getPathMatch(rule.source, {
      removeUnnamedParams: true,
      strict: true,
    });
    const params = matcher(pathname);
    if (!params) continue;
    const { newUrl, parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params,
      query: {},
    });
    return `${parsedDestination.protocol}//${parsedDestination.hostname}${newUrl}`;
  }
  return null;
}

describe('blog 리디렉션 규칙', () => {
  test('루트는 blog 루트로', async () => {
    expect(await resolveRedirect('/')).toBe('https://blog.sangwook.dev/');
  });

  test.each(['/sitemap.xml', '/robots.txt', '/rss.xml'])(
    '루트 레벨 파일 %s 은 후행 슬래시 없이 전달 (GitHub Pages 404 방지)',
    async path => {
      expect(await resolveRedirect(path)).toBe(
        `https://blog.sangwook.dev${path}`,
      );
    },
  );

  test('하위 경로 파일도 슬래시 인코딩(%2F) 없이 그대로 전달', async () => {
    // gemini 리뷰 지적 케이스: 커스텀 정규식 param이 다중 세그먼트를 캡처할 때
    // 목적지 컴파일에서 %2F로 인코딩되지 않는지 잠근다.
    expect(await resolveRedirect('/assets/logo.png')).toBe(
      'https://blog.sangwook.dev/assets/logo.png',
    );
    expect(await resolveRedirect('/posts/img/pic.png')).toBe(
      'https://blog.sangwook.dev/posts/img/pic.png',
    );
  });

  test('확장자 없는 일반 경로는 후행 슬래시를 붙여 전달', async () => {
    expect(await resolveRedirect('/posts/some-post')).toBe(
      'https://blog.sangwook.dev/posts/some-post/',
    );
    expect(await resolveRedirect('/about')).toBe(
      'https://blog.sangwook.dev/about/',
    );
  });

  test('파일 규칙이 catch-all 규칙보다 먼저 온다 (순서 회귀 방지)', async () => {
    const redirects = await nextConfig.redirects!();
    const fileRuleIdx = redirects.findIndex(r =>
      r.source.includes('a-zA-Z0-9'),
    );
    const catchAllIdx = redirects.findIndex(r => r.source === '/:path+');
    expect(fileRuleIdx).toBeGreaterThan(-1);
    expect(catchAllIdx).toBeGreaterThan(-1);
    expect(fileRuleIdx).toBeLessThan(catchAllIdx);
  });
});
