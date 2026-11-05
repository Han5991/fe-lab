/**
 * 본문 링크 중 무엇이 클라이언트 내비게이션(`TransitionLink`)을 타는가. origin은 실제 사이트(`SITE_URL`)와
 * 일부러 다른 값이다 — 인자를 무시하고 상수를 읽는 구현이면 아래 "실제 사이트 주소" 케이스가 깨진다.
 */
import { describe, expect, test } from 'vitest';
import { SITE_URL } from '@/content.values.mts';
import { sitePagePath } from './bodyLink';

const SITE = 'https://blog.test';

describe('sitePagePath', () => {
  test.each([
    ['같은 출처의 글', `${SITE}/posts/a/`, '/posts/a/'],
    ['같은 출처의 홈', SITE, '/'],
    ['쿼리·해시는 그대로', `${SITE}/posts/?tag=ts#top`, '/posts/?tag=ts#top'],
    ['루트 상대 경로', '/series/', '/series/'],
    [
      '인코딩된 slug는 다시 인코딩하지 않는다',
      `${SITE}/posts/%ED%95%9C%EA%B8%80/`,
      '/posts/%ED%95%9C%EA%B8%80/',
    ],
    ['호스트의 대소문자', 'HTTPS://BLOG.TEST/about/', '/about/'],
  ])('%s → 사이트 경로', (_, href, path) => {
    expect(sitePagePath(href, SITE)).toBe(path);
  });

  test.each([
    ['다른 사이트', 'https://github.com/'],
    ['실제 사이트 주소 — origin은 인자가 정한다', `${SITE_URL}/posts/a/`],
    ['스킴이 다르면 다른 출처', 'http://blog.test/posts/a/'],
    ['프로토콜 상대 주소', '//blog.test/posts/a/'],
    ['파일(후행 슬래시 없음)', '/rss.xml'],
    ['같은 출처의 파일', `${SITE}/og/a.png`],
    ['슬래시 없는 페이지 주소', '/posts/a'],
    ['해시', '#section'],
    ['지금 글 기준 상대 경로', './other/'],
    ['지금 글 기준 상대 경로(점 없이)', 'other/'],
    ['mailto', 'mailto:me@blog.test'],
  ])('%s → null', (_, href) => {
    expect(sitePagePath(href, SITE)).toBeNull();
  });
});
