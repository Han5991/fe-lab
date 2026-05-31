import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  generateMultipleTrackingImages,
  generateTrackingImageFromUrl,
  generateVelogMarkdown,
  generateVelogTrackingImage,
} from './ga-proxy-generator';

// 주의: 이 함수들은 host/page를 encodeURIComponent한 뒤 다시 URLSearchParams로
// 직렬화해 '%'가 한 번 더 인코딩되는 이중 인코딩(예: '/' → %252F)이 발생한다.
// 아래 테스트는 이 인코딩이 "옳다"는 계약 검증이 아니라 **현재 동작을 회귀로
// 고정**하는 것이다. 소비자인 ga-proxy 서버(apps/ga-proxy)가 page/host를 몇 번
// 디코딩하는지와 대조해 단일/이중 디코딩 계약을 확정하는 것은 별도 과제다.
// (서버가 1회만 디코딩하면 추적 파라미터가 깨지므로 그쪽과 함께 봐야 한다.)

// ---------------------------------------------------------------------------
// generateVelogTrackingImage
// ---------------------------------------------------------------------------

test('generateVelogTrackingImage: baseUrl 미지정 시 기본값 your-blog.com 사용', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/abc',
  });
  assert.ok(url.startsWith('https://your-blog.com/api/ga-proxy?'));
});

test('generateVelogTrackingImage: baseUrl 지정 시 해당 도메인 사용', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/abc',
    baseUrl: 'https://blog.sangwook.dev',
  });
  assert.ok(url.startsWith('https://blog.sangwook.dev/api/ga-proxy?'));
});

test('generateVelogTrackingImage: 항상 tid=velog 쿼리 포함', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/abc',
  });
  assert.ok(url.includes('tid=velog'));
});

test('generateVelogTrackingImage: 특수문자 없는 host/page는 그대로 직렬화', () => {
  const url = generateVelogTrackingImage({ host: 'velog.io', page: 'p' });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=p',
  );
});

test('generateVelogTrackingImage: 슬래시가 든 page는 이중 인코딩(/ → %252F)', () => {
  // encodeURIComponent('/posts/abc') → %2Fposts%2Fabc,
  // 그 결과를 URLSearchParams가 다시 인코딩 → %252Fposts%252Fabc
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/abc',
  });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252Fposts%252Fabc',
  );
});

test('generateVelogTrackingImage: 한글·공백·&·?·= 가 든 page도 이중 인코딩', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/한글 제목?x=1&y=2',
  });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252Fposts%252F%25ED%2595%259C%25EA%25B8%2580%2520%25EC%25A0%259C%25EB%25AA%25A9%253Fx%253D1%2526y%253D2',
  );
});

test('generateVelogTrackingImage: + 문자도 이중 인코딩(+ → %252B)', () => {
  const url = generateVelogTrackingImage({ host: 'h', page: 'a+b' });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=h&page=a%252Bb',
  );
});

test('generateVelogTrackingImage: title 제공 시 title param 추가(공백 → %2520)', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/abc',
    title: 'My Post',
  });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252Fposts%252Fabc&title=My%2520Post',
  );
});

test('generateVelogTrackingImage: title 미제공 시 title param 없음', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/abc',
  });
  assert.ok(!url.includes('title='));
});

test('generateVelogTrackingImage: title이 빈 문자열이면 falsy로 처리되어 param 없음', () => {
  const url = generateVelogTrackingImage({ host: 'h', page: 'p', title: '' });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=h&page=p',
  );
  assert.ok(!url.includes('title='));
});

test('generateVelogTrackingImage: 특수문자가 든 title은 이중 인코딩(& → %2526, = → %253D)', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/p',
    title: 'a b&c=d',
  });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252Fp&title=a%2520b%2526c%253Dd',
  );
});

test('generateVelogTrackingImage: referrer 제공 시 referrer param 추가(이중 인코딩)', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/abc',
    referrer: 'https://google.com',
  });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252Fposts%252Fabc&referrer=https%253A%252F%252Fgoogle.com',
  );
});

test('generateVelogTrackingImage: referrer 미제공 시 referrer param 없음', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/posts/abc',
  });
  assert.ok(!url.includes('referrer='));
});

test('generateVelogTrackingImage: referrer가 빈 문자열이면 param 없음', () => {
  const url = generateVelogTrackingImage({
    host: 'h',
    page: 'p',
    referrer: '',
  });
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=h&page=p',
  );
  assert.ok(!url.includes('referrer='));
});

test('generateVelogTrackingImage: title·referrer 모두 제공 시 둘 다 포함', () => {
  const url = generateVelogTrackingImage({
    host: 'velog.io',
    page: '/p',
    title: 'T',
    referrer: 'https://r.com',
  });
  assert.ok(url.includes('title=T'));
  assert.ok(url.includes('referrer=https%253A%252F%252Fr.com'));
});

test('generateVelogTrackingImage: 빈 host/page도 빈 값으로 직렬화', () => {
  const url = generateVelogTrackingImage({ host: '', page: '' });
  assert.equal(url, 'https://your-blog.com/api/ga-proxy?tid=velog&host=&page=');
});

// ---------------------------------------------------------------------------
// generateVelogMarkdown
// ---------------------------------------------------------------------------

test('generateVelogMarkdown: ![](url) 형식으로 감싼다', () => {
  const md = generateVelogMarkdown({ host: 'velog.io', page: '/posts/abc' });
  assert.equal(
    md,
    '![](https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252Fposts%252Fabc)',
  );
});

test('generateVelogMarkdown: 내부 URL은 generateVelogTrackingImage 결과와 동일', () => {
  const options = { host: 'velog.io', page: '/p', title: 'T' };
  const md = generateVelogMarkdown(options);
  const url = generateVelogTrackingImage(options);
  assert.equal(md, `![](${url})`);
});

// ---------------------------------------------------------------------------
// generateMultipleTrackingImages
// ---------------------------------------------------------------------------

test('generateMultipleTrackingImages: 빈 배열이면 빈 배열 반환', () => {
  assert.deepEqual(generateMultipleTrackingImages([]), []);
});

test('generateMultipleTrackingImages: host 미지정 시 velog.io 폴백 + page=/posts/{slug}', () => {
  const result = generateMultipleTrackingImages([{ slug: 'a', title: 'A' }]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    slug: 'a',
    markdown:
      '![](https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252Fposts%252Fa&title=A)',
    url: 'https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252Fposts%252Fa&title=A',
  });
});

test('generateMultipleTrackingImages: host 지정 시 해당 host 사용', () => {
  const result = generateMultipleTrackingImages([
    { slug: 'b', title: 'B', host: 'custom.io' },
  ]);
  assert.equal(result[0].url.includes('host=custom.io'), true);
  assert.equal(result[0].slug, 'b');
});

test('generateMultipleTrackingImages: 여러 포스트를 입력 순서대로 매핑', () => {
  const result = generateMultipleTrackingImages([
    { slug: 'a', title: 'A' },
    { slug: 'b', title: 'B', host: 'custom.io' },
  ]);
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map(r => r.slug),
    ['a', 'b'],
  );
  assert.ok(result[0].url.includes('host=velog.io'));
  assert.ok(result[1].url.includes('host=custom.io'));
});

test('generateMultipleTrackingImages: 각 항목은 slug/markdown/url 키를 가진다', () => {
  const [item] = generateMultipleTrackingImages([{ slug: 'x', title: 'X' }]);
  assert.deepEqual(Object.keys(item).sort(), ['markdown', 'slug', 'url']);
  assert.equal(item.markdown, `![](${item.url})`);
});

test('generateMultipleTrackingImages: 슬래시가 든 slug도 이중 인코딩되어 page에 반영', () => {
  const [item] = generateMultipleTrackingImages([{ slug: 'a/b', title: 'AB' }]);
  // page = '/posts/a/b' → 이중 인코딩
  assert.ok(item.url.includes('page=%252Fposts%252Fa%252Fb'));
});

// ---------------------------------------------------------------------------
// generateTrackingImageFromUrl
// ---------------------------------------------------------------------------

test('generateTrackingImageFromUrl: 정상 URL이면 hostname/(pathname+search) 추출', () => {
  const url = generateTrackingImageFromUrl(
    'https://velog.io/@user/post-slug?foo=bar',
  );
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%252F%2540user%252Fpost-slug%253Ffoo%253Dbar',
  );
});

test('generateTrackingImageFromUrl: baseUrl 전달 시 해당 도메인 사용', () => {
  const url = generateTrackingImageFromUrl(
    'https://velog.io/@user/post',
    'https://blog.sangwook.dev',
  );
  assert.equal(
    url,
    'https://blog.sangwook.dev/api/ga-proxy?tid=velog&host=velog.io&page=%252F%2540user%252Fpost',
  );
});

test('generateTrackingImageFromUrl: search 없는 URL은 pathname만 page에 반영', () => {
  const url = generateTrackingImageFromUrl('https://example.com/path');
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=example.com&page=%252Fpath',
  );
});

test('generateTrackingImageFromUrl: 루트 URL은 pathname이 / 로 정규화되어 page=%252F', () => {
  const url = generateTrackingImageFromUrl('https://example.com');
  assert.equal(
    url,
    'https://your-blog.com/api/ga-proxy?tid=velog&host=example.com&page=%252F',
  );
});

test('generateTrackingImageFromUrl: 잘못된 URL이면 Invalid URL format 에러를 throw', () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.throws(
      () => generateTrackingImageFromUrl('not-a-url'),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'Invalid URL format');
        return true;
      },
    );
  } finally {
    console.error = original;
  }
});

test('generateTrackingImageFromUrl: 빈 문자열도 잘못된 URL로 간주되어 throw', () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.throws(() => generateTrackingImageFromUrl(''), {
      message: 'Invalid URL format',
    });
  } finally {
    console.error = original;
  }
});
