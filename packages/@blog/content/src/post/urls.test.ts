import { expect, test } from 'vitest';
import { TEST_VALUES } from '../shared/testValues.ts';
import {
  archivePath,
  archiveUrl,
  POSTS_PATH,
  postPath,
  postUrl,
} from './urls.ts';

// origin은 설정에서 온다 — 기대값도 픽스처에서 가져와 "설정이 흐르는가"를 함께 잠근다.
const SITE_URL = TEST_VALUES.site.url;

// ── postPath / postUrl ───────────────────────────────────────────────────────

test('postPath: 세그먼트는 인코딩되고 구분자(/)와 후행 슬래시는 보존된다', () => {
  expect(postPath('a/b')).toBe('/posts/a/b/');
  // 인코딩 결과에 원문 세그먼트가 남지 않고, 라우트 모양(/posts/…/)은 유지된다.
  const encoded = postPath('한글/글 제목');
  expect(encoded.startsWith('/posts/')).toBeTruthy();
  expect(encoded.endsWith('/')).toBeTruthy();
  expect(!encoded.includes('한글')).toBeTruthy();
});

test('postPath: 인코딩 리터럴 고정 — 한글·공백 세그먼트', () => {
  // 이 리터럴이 곧 배포되는 링크의 모양이다. postPath를 다시 불러 비교하는
  // 다른 테스트들과 달리, 여기 하나만 결과 문자열 자체를 고정한다.
  expect(postPath('번들러/3편')).toBe(
    '/posts/%EB%B2%88%EB%93%A4%EB%9F%AC/3%ED%8E%B8/',
  );
  expect(postPath('한글/글 제목')).toBe(
    '/posts/%ED%95%9C%EA%B8%80/%EA%B8%80%20%EC%A0%9C%EB%AA%A9/',
  );
});

test('postUrl: siteUrl을 생략하면 SITE_URL, 주입하면 그 origin을 쓴다', () => {
  expect(postUrl('a', SITE_URL)).toBe(`${SITE_URL}/posts/a/`);
  expect(postUrl('a', 'https://example.dev')).toBe(
    'https://example.dev/posts/a/',
  );
});

test('postUrl: 경로 규칙은 postPath와 정확히 같다 (따로 조립하지 않는다)', () => {
  const slug = '한글/글 제목';
  expect(postUrl(slug, 'https://example.dev')).toBe(
    `https://example.dev${postPath(slug)}`,
  );
});

// ── archivePath / archiveUrl ─────────────────────────────────────────────────

test('archivePath: 필터가 없으면 POSTS_PATH 그대로 (빈 `?`가 붙지 않는다)', () => {
  expect(archivePath()).toBe(POSTS_PATH);
  expect(archivePath({})).toBe(POSTS_PATH);
});

test('archivePath: 공백은 +가 아니라 %20 — URLSearchParams와 갈리는 지점', () => {
  // PostHeader.test.tsx가 잠근 기존 링크 형태(c%2B%2B%20%26%20rust)와 같아야 한다.
  expect(archivePath({ tag: 'c++ & rust' })).toBe(
    '/posts/?tag=c%2B%2B%20%26%20rust',
  );
});

test('archivePath: undefined 필터 키는 쿼리에 넣지 않는다', () => {
  expect(archivePath({ tag: 'react', series: undefined })).toBe(
    '/posts/?tag=react',
  );
});

test('archivePath: 복수 필터는 &로 잇는다', () => {
  expect(archivePath({ tag: '태그', series: 'bundler' })).toBe(
    '/posts/?tag=%ED%83%9C%EA%B7%B8&series=bundler',
  );
});

test('archiveUrl: siteUrl 주입 + POSTS_PATH 규칙 공유', () => {
  expect(archiveUrl(SITE_URL)).toBe(`${SITE_URL}${POSTS_PATH}`);
  expect(archiveUrl('https://example.dev')).toBe('https://example.dev/posts/');
});
