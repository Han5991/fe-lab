import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveThumbnailUrl, resolveAbsoluteThumbnailUrl } from './thumbnail';

// 인코딩 결과 상수 (실제 encodeURIComponent / encodePostSlug 출력으로 확정)
const ENC_BUNDLER = '%EB%B2%88%EB%93%A4%EB%9F%AC'; // '번들러'
const ENC_3PYEON = '3%ED%8E%B8'; // '3편'

test('resolveThumbnailUrl: thumbnail이 undefined면 기본 OG 이미지', () => {
  assert.equal(resolveThumbnailUrl({ relativeDir: '' }), '/og-default.png');
});

test('resolveThumbnailUrl: thumbnail이 빈 문자열이면 기본 OG 이미지', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: '', relativeDir: '번들러/3편' }),
    '/og-default.png',
  );
});

test('resolveThumbnailUrl: https URL은 그대로 반환', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'https://cdn/x.png', relativeDir: '' }),
    'https://cdn/x.png',
  );
});

test('resolveThumbnailUrl: http URL은 그대로 반환', () => {
  assert.equal(
    resolveThumbnailUrl({
      thumbnail: 'http://example.com/a/b.png',
      relativeDir: '번들러/3편',
    }),
    'http://example.com/a/b.png',
  );
});

test('resolveThumbnailUrl: 슬래시로 시작하는 절대 경로는 그대로 반환', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: '/abs/x.png', relativeDir: '번들러' }),
    '/abs/x.png',
  );
});

test('resolveThumbnailUrl: 루트 슬래시 하나도 절대 경로로 간주하여 그대로', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: '/', relativeDir: '번들러' }),
    '/',
  );
});

test('resolveThumbnailUrl: 상대 경로 + 한글 relativeDir (디렉터리 구분자 보존, 한글 인코딩)', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'cover.png', relativeDir: '번들러/3편' }),
    `/posts/${ENC_BUNDLER}/${ENC_3PYEON}/cover.png`,
  );
});

test('resolveThumbnailUrl: 상대 경로 + relativeDir 빈 문자열', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'cover.png', relativeDir: '' }),
    '/posts/cover.png',
  );
});

test('resolveThumbnailUrl: 상대 경로 + 단일 ASCII 디렉터리', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'cover.png', relativeDir: 'bundler' }),
    '/posts/bundler/cover.png',
  );
});

test('resolveThumbnailUrl: 디렉터리 구분자는 세그먼트별 인코딩으로 보존', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'cover.png', relativeDir: 'a/b/c' }),
    '/posts/a/b/c/cover.png',
  );
});

test('resolveThumbnailUrl: relativeDir의 공백은 %20으로 인코딩', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'cover.png', relativeDir: 'my dir' }),
    '/posts/my%20dir/cover.png',
  );
});

test('resolveThumbnailUrl: thumbnail 파일명의 공백/특수문자 인코딩', () => {
  assert.equal(
    resolveThumbnailUrl({
      thumbnail: '내 사진 (1).png',
      relativeDir: '',
    }),
    '/posts/%EB%82%B4%20%EC%82%AC%EC%A7%84%20(1).png',
  );
});

test('resolveThumbnailUrl: thumbnail 파일명의 슬래시는 %2F로 인코딩 (구분자 보존 아님)', () => {
  // thumbnail은 encodeURIComponent 통째 적용 → 내부 '/'는 %2F
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'sub/cover.png', relativeDir: 'dir' }),
    '/posts/dir/sub%2Fcover.png',
  );
});

test('resolveThumbnailUrl: relativeDir 한글 단일 세그먼트', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'cover.png', relativeDir: '번들러' }),
    `/posts/${ENC_BUNDLER}/cover.png`,
  );
});

test('resolveThumbnailUrl: http로 시작하지만 https인 문자열도 startsWith("http") 매칭으로 그대로', () => {
  assert.equal(
    resolveThumbnailUrl({ thumbnail: 'httpsfoo', relativeDir: 'dir' }),
    'httpsfoo',
  );
});

test('resolveAbsoluteThumbnailUrl: 기본 OG 이미지에는 SITE_URL prefix', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl({ relativeDir: '' }),
    'https://blog.sangwook.dev/og-default.png',
  );
});

test('resolveAbsoluteThumbnailUrl: 슬래시 절대 경로에는 SITE_URL prefix', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl({ thumbnail: '/abs/x.png', relativeDir: '' }),
    'https://blog.sangwook.dev/abs/x.png',
  );
});

test('resolveAbsoluteThumbnailUrl: 상대 경로 결과에 SITE_URL prefix (한글 인코딩 포함)', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl({
      thumbnail: 'cover.png',
      relativeDir: '번들러/3편',
    }),
    `https://blog.sangwook.dev/posts/${ENC_BUNDLER}/${ENC_3PYEON}/cover.png`,
  );
});

test('resolveAbsoluteThumbnailUrl: https URL은 prefix 없이 그대로', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl({
      thumbnail: 'https://cdn/x.png',
      relativeDir: '',
    }),
    'https://cdn/x.png',
  );
});

test('resolveAbsoluteThumbnailUrl: http URL은 prefix 없이 그대로', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl({
      thumbnail: 'http://example.com/x.png',
      relativeDir: 'dir',
    }),
    'http://example.com/x.png',
  );
});
