import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SITE_URL } from '../../lib/shared/constants';
import { archivePath, archiveUrl, POSTS_PATH, postPath, postUrl } from './urls';

// ── postPath / postUrl ───────────────────────────────────────────────────────

test('postPath: 세그먼트는 인코딩되고 구분자(/)와 후행 슬래시는 보존된다', () => {
  assert.equal(postPath('a/b'), '/posts/a/b/');
  // 인코딩 결과에 원문 세그먼트가 남지 않고, 라우트 모양(/posts/…/)은 유지된다.
  const encoded = postPath('한글/글 제목');
  assert.ok(encoded.startsWith('/posts/'));
  assert.ok(encoded.endsWith('/'));
  assert.ok(!encoded.includes('한글'));
});

test('postPath: 인코딩 리터럴 고정 — 한글·공백 세그먼트', () => {
  // 이 리터럴이 곧 배포되는 링크의 모양이다. postPath를 다시 불러 비교하는
  // 다른 테스트들과 달리, 여기 하나만 결과 문자열 자체를 고정한다.
  assert.equal(
    postPath('번들러/3편'),
    '/posts/%EB%B2%88%EB%93%A4%EB%9F%AC/3%ED%8E%B8/',
  );
  assert.equal(
    postPath('한글/글 제목'),
    '/posts/%ED%95%9C%EA%B8%80/%EA%B8%80%20%EC%A0%9C%EB%AA%A9/',
  );
});

test('postUrl: siteUrl을 생략하면 SITE_URL, 주입하면 그 origin을 쓴다', () => {
  assert.equal(postUrl('a'), `${SITE_URL}/posts/a/`);
  assert.equal(
    postUrl('a', 'https://example.dev'),
    'https://example.dev/posts/a/',
  );
});

test('postUrl: 경로 규칙은 postPath와 정확히 같다 (따로 조립하지 않는다)', () => {
  const slug = '한글/글 제목';
  assert.equal(
    postUrl(slug, 'https://example.dev'),
    `https://example.dev${postPath(slug)}`,
  );
});

// ── archivePath / archiveUrl ─────────────────────────────────────────────────

test('archivePath: 필터가 없으면 POSTS_PATH 그대로 (빈 `?`가 붙지 않는다)', () => {
  assert.equal(archivePath(), POSTS_PATH);
  assert.equal(archivePath({}), POSTS_PATH);
});

test('archivePath: 공백은 +가 아니라 %20 — URLSearchParams와 갈리는 지점', () => {
  // PostHeader.test.tsx가 잠근 기존 링크 형태(c%2B%2B%20%26%20rust)와 같아야 한다.
  assert.equal(
    archivePath({ tag: 'c++ & rust' }),
    '/posts/?tag=c%2B%2B%20%26%20rust',
  );
});

test('archivePath: undefined 필터 키는 쿼리에 넣지 않는다', () => {
  assert.equal(
    archivePath({ tag: 'react', series: undefined }),
    '/posts/?tag=react',
  );
});

test('archivePath: 복수 필터는 &로 잇는다', () => {
  assert.equal(
    archivePath({ tag: '태그', series: 'bundler' }),
    '/posts/?tag=%ED%83%9C%EA%B7%B8&series=bundler',
  );
});

test('archiveUrl: siteUrl 주입 + POSTS_PATH 규칙 공유', () => {
  assert.equal(archiveUrl(), `${SITE_URL}${POSTS_PATH}`);
  assert.equal(archiveUrl('https://example.dev'), 'https://example.dev/posts/');
});
