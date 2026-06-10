import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveThumbnailUrl, resolveAbsoluteThumbnailUrl } from './thumbnail';

// 인코딩 결과 상수 (실제 encodeURIComponent / encodePostSlug 출력으로 확정)
const ENC_BUNDLER = '%EB%B2%88%EB%93%A4%EB%9F%AC'; // '번들러'
const ENC_3PYEON = '3%ED%8E%B8'; // '3편'

/** 테스트 입력 헬퍼 — slug는 Pick에 포함되므로 기본값 제공 */
function p(over: { thumbnail?: string; relativeDir?: string; slug?: string }): {
  thumbnail?: string;
  relativeDir: string;
  slug: string;
} {
  return { relativeDir: '', slug: 'my-post', ...over };
}

test('resolveThumbnailUrl: thumbnail이 undefined면 생성된 OG 카드(/og/{slug}.png)', () => {
  assert.equal(resolveThumbnailUrl(p({})), '/og/my-post.png');
});

test('resolveThumbnailUrl: thumbnail이 빈 문자열이어도 생성된 OG 카드', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: '', relativeDir: '번들러/3편' })),
    '/og/my-post.png',
  );
});

test('resolveThumbnailUrl: 한글/중첩 slug는 세그먼트별 인코딩 (구분자 보존)', () => {
  assert.equal(
    resolveThumbnailUrl(p({ slug: '번들러/3편' })),
    `/og/${ENC_BUNDLER}/${ENC_3PYEON}.png`,
  );
});

test('resolveThumbnailUrl: slug가 빈 문자열이면 기본 OG 이미지로 fallback', () => {
  assert.equal(resolveThumbnailUrl(p({ slug: '' })), '/og-default.png');
});

test('resolveThumbnailUrl: https URL은 그대로 반환', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: 'https://cdn/x.png' })),
    'https://cdn/x.png',
  );
});

test('resolveThumbnailUrl: http URL은 그대로 반환', () => {
  assert.equal(
    resolveThumbnailUrl(
      p({ thumbnail: 'http://example.com/a/b.png', relativeDir: '번들러/3편' }),
    ),
    'http://example.com/a/b.png',
  );
});

test('resolveThumbnailUrl: 슬래시로 시작하는 절대 경로는 그대로 반환', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: '/abs/x.png', relativeDir: '번들러' })),
    '/abs/x.png',
  );
});

test('resolveThumbnailUrl: 루트 슬래시 하나도 절대 경로로 간주하여 그대로', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: '/', relativeDir: '번들러' })),
    '/',
  );
});

test('resolveThumbnailUrl: 상대 경로 + 한글 relativeDir (디렉터리 구분자 보존, 한글 인코딩)', () => {
  assert.equal(
    resolveThumbnailUrl(
      p({ thumbnail: 'cover.png', relativeDir: '번들러/3편' }),
    ),
    `/posts/${ENC_BUNDLER}/${ENC_3PYEON}/cover.png`,
  );
});

test('resolveThumbnailUrl: 상대 경로 + relativeDir 빈 문자열', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png' })),
    '/posts/cover.png',
  );
});

test('resolveThumbnailUrl: 상대 경로 + 단일 ASCII 디렉터리', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png', relativeDir: 'bundler' })),
    '/posts/bundler/cover.png',
  );
});

test('resolveThumbnailUrl: 디렉터리 구분자는 세그먼트별 인코딩으로 보존', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png', relativeDir: 'a/b/c' })),
    '/posts/a/b/c/cover.png',
  );
});

test('resolveThumbnailUrl: relativeDir의 공백은 %20으로 인코딩', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png', relativeDir: 'my dir' })),
    '/posts/my%20dir/cover.png',
  );
});

test('resolveThumbnailUrl: thumbnail 파일명의 공백/특수문자 인코딩', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: '내 사진 (1).png' })),
    '/posts/%EB%82%B4%20%EC%82%AC%EC%A7%84%20(1).png',
  );
});

test('resolveThumbnailUrl: thumbnail 파일명의 슬래시는 %2F로 인코딩 (구분자 보존 아님)', () => {
  // thumbnail은 encodeURIComponent 통째 적용 → 내부 '/'는 %2F
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: 'sub/cover.png', relativeDir: 'dir' })),
    '/posts/dir/sub%2Fcover.png',
  );
});

test('resolveThumbnailUrl: relativeDir 한글 단일 세그먼트', () => {
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png', relativeDir: '번들러' })),
    `/posts/${ENC_BUNDLER}/cover.png`,
  );
});

test('resolveThumbnailUrl: startsWith("http") quirk — http로 시작하는 비URL도 절대로 간주', () => {
  // 절대 판정이 startsWith('http')라 'httpsfoo'·'http-guide.png' 같은 상대
  // 파일명도 외부 URL로 오분류되어 미해결 반환된다. 현재 동작 회귀 고정이며,
  // 'http://'·'https://' 프리픽스로 좁히는 게 옳은지는 별도 검토 대상이다.
  assert.equal(
    resolveThumbnailUrl(p({ thumbnail: 'httpsfoo', relativeDir: 'dir' })),
    'httpsfoo',
  );
});

test('resolveAbsoluteThumbnailUrl: 생성된 OG 카드에 SITE_URL prefix', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl(p({})),
    'https://blog.sangwook.dev/og/my-post.png',
  );
});

test('resolveAbsoluteThumbnailUrl: slug 없으면 기본 OG 이미지에 SITE_URL prefix', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl(p({ slug: '' })),
    'https://blog.sangwook.dev/og-default.png',
  );
});

test('resolveAbsoluteThumbnailUrl: 슬래시 절대 경로에는 SITE_URL prefix', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl(p({ thumbnail: '/abs/x.png' })),
    'https://blog.sangwook.dev/abs/x.png',
  );
});

test('resolveAbsoluteThumbnailUrl: 상대 경로 결과에 SITE_URL prefix (한글 인코딩 포함)', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl(
      p({ thumbnail: 'cover.png', relativeDir: '번들러/3편' }),
    ),
    `https://blog.sangwook.dev/posts/${ENC_BUNDLER}/${ENC_3PYEON}/cover.png`,
  );
});

test('resolveAbsoluteThumbnailUrl: https URL은 prefix 없이 그대로', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl(p({ thumbnail: 'https://cdn/x.png' })),
    'https://cdn/x.png',
  );
});

test('resolveAbsoluteThumbnailUrl: http URL은 prefix 없이 그대로', () => {
  assert.equal(
    resolveAbsoluteThumbnailUrl(
      p({ thumbnail: 'http://example.com/x.png', relativeDir: 'dir' }),
    ),
    'http://example.com/x.png',
  );
});
