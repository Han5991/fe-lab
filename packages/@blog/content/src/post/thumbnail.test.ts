import { expect, test } from 'vitest';
import {
  resolveThumbnailUrl as resolveThumbnailUrlIn,
  resolveAbsoluteThumbnailUrl as resolveAbsoluteThumbnailUrlIn,
  resolveThumbnailSrc as resolveThumbnailSrcIn,
  isOptimizableThumbnail,
  thumbnailWebpRelPath,
} from './thumbnail.ts';
import { TEST_VALUES } from '../shared/testValues.ts';

// origin·기본 OG 이미지는 설정에서 온다 — 기대값도 픽스처에서 가져온다.
const SITE = TEST_VALUES.site;
const SITE_URL = SITE.url;
const OG_DEFAULT_IMAGE = SITE.ogDefaultImage;
const resolveThumbnailUrl = (
  post: Parameters<typeof resolveThumbnailUrlIn>[0],
): string => resolveThumbnailUrlIn(post, OG_DEFAULT_IMAGE);
const resolveAbsoluteThumbnailUrl = (
  post: Parameters<typeof resolveAbsoluteThumbnailUrlIn>[0],
): string => resolveAbsoluteThumbnailUrlIn(post, SITE);
const resolveThumbnailSrc = (
  post: Parameters<typeof resolveThumbnailSrcIn>[0],
): string => resolveThumbnailSrcIn(post, OG_DEFAULT_IMAGE);

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
  expect(resolveThumbnailUrl(p({}))).toBe('/og/my-post.png');
});

test('resolveThumbnailUrl: thumbnail이 빈 문자열이어도 생성된 OG 카드', () => {
  expect(
    resolveThumbnailUrl(p({ thumbnail: '', relativeDir: '번들러/3편' })),
  ).toBe('/og/my-post.png');
});

test('resolveThumbnailUrl: 한글/중첩 slug는 세그먼트별 인코딩 (구분자 보존)', () => {
  expect(resolveThumbnailUrl(p({ slug: '번들러/3편' }))).toBe(
    `/og/${ENC_BUNDLER}/${ENC_3PYEON}.png`,
  );
});

test('resolveThumbnailUrl: slug가 빈 문자열이면 기본 OG 이미지로 fallback', () => {
  expect(resolveThumbnailUrl(p({ slug: '' }))).toBe(OG_DEFAULT_IMAGE);
});

test('resolveThumbnailUrl: https URL은 그대로 반환', () => {
  expect(resolveThumbnailUrl(p({ thumbnail: 'https://cdn/x.png' }))).toBe(
    'https://cdn/x.png',
  );
});

test('resolveThumbnailUrl: http URL은 그대로 반환', () => {
  expect(
    resolveThumbnailUrl(
      p({ thumbnail: 'http://example.com/a/b.png', relativeDir: '번들러/3편' }),
    ),
  ).toBe('http://example.com/a/b.png');
});

test('resolveThumbnailUrl: 슬래시로 시작하는 절대 경로는 그대로 반환', () => {
  expect(
    resolveThumbnailUrl(p({ thumbnail: '/abs/x.png', relativeDir: '번들러' })),
  ).toBe('/abs/x.png');
});

test('resolveThumbnailUrl: 루트 슬래시 하나도 절대 경로로 간주하여 그대로', () => {
  expect(
    resolveThumbnailUrl(p({ thumbnail: '/', relativeDir: '번들러' })),
  ).toBe('/');
});

test('resolveThumbnailUrl: 상대 경로 + 한글 relativeDir (디렉터리 구분자 보존, 한글 인코딩)', () => {
  expect(
    resolveThumbnailUrl(
      p({ thumbnail: 'cover.png', relativeDir: '번들러/3편' }),
    ),
  ).toBe(`/posts/${ENC_BUNDLER}/${ENC_3PYEON}/cover.png`);
});

test('resolveThumbnailUrl: 상대 경로 + relativeDir 빈 문자열', () => {
  expect(resolveThumbnailUrl(p({ thumbnail: 'cover.png' }))).toBe(
    '/posts/cover.png',
  );
});

test('resolveThumbnailUrl: 상대 경로 + 단일 ASCII 디렉터리', () => {
  expect(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png', relativeDir: 'bundler' })),
  ).toBe('/posts/bundler/cover.png');
});

test('resolveThumbnailUrl: 디렉터리 구분자는 세그먼트별 인코딩으로 보존', () => {
  expect(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png', relativeDir: 'a/b/c' })),
  ).toBe('/posts/a/b/c/cover.png');
});

test('resolveThumbnailUrl: relativeDir의 공백은 %20으로 인코딩', () => {
  expect(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png', relativeDir: 'my dir' })),
  ).toBe('/posts/my%20dir/cover.png');
});

test('resolveThumbnailUrl: thumbnail 파일명의 공백/특수문자 인코딩', () => {
  expect(resolveThumbnailUrl(p({ thumbnail: '내 사진 (1).png' }))).toBe(
    '/posts/%EB%82%B4%20%EC%82%AC%EC%A7%84%20(1).png',
  );
});

test('resolveThumbnailUrl: thumbnail 하위 경로의 슬래시는 구분자로 보존 (세그먼트별 인코딩)', () => {
  // 예전에는 파일명을 통째로 encodeURIComponent해 '/posts/dir/sub%2Fcover.png'가
  // 됐다 — `%2F`는 정적 호스트에서 경로 구분자가 아니라 404. 본문 이미지
  // (resolvePostAssetUrl)와 같은 규칙으로 맞춘다.
  expect(
    resolveThumbnailUrl(p({ thumbnail: 'sub/cover.png', relativeDir: 'dir' })),
  ).toBe('/posts/dir/sub/cover.png');
  expect(
    resolveThumbnailUrl(
      p({ thumbnail: '그림/내 표지.png', relativeDir: 'dir' }),
    ),
  ).toBe('/posts/dir/%EA%B7%B8%EB%A6%BC/%EB%82%B4%20%ED%91%9C%EC%A7%80.png');
});

test('resolveThumbnailUrl: 앞의 ./는 벗긴다 (resolvePostAssetUrl과 같은 규칙)', () => {
  expect(
    resolveThumbnailUrl(
      p({ thumbnail: './cover.png', relativeDir: 'network' }),
    ),
  ).toBe('/posts/network/cover.png');
});

test('resolveThumbnailUrl: relativeDir 한글 단일 세그먼트', () => {
  expect(
    resolveThumbnailUrl(p({ thumbnail: 'cover.png', relativeDir: '번들러' })),
  ).toBe(`/posts/${ENC_BUNDLER}/cover.png`);
});

test('resolveThumbnailUrl: http로 시작하는 상대 파일명은 외부 URL이 아니다', () => {
  // 예전 판정은 startsWith('http')라 `http2-flow.png`가 외부 URL로 분류돼
  // 카드·og:image가 맨 파일명을 가리켰다. 스킴(`xxx:`)이 있어야 외부 URL이다.
  expect(
    resolveThumbnailUrl(
      p({ thumbnail: 'http2-flow.png', relativeDir: 'network' }),
    ),
  ).toBe('/posts/network/http2-flow.png');
  expect(
    resolveThumbnailUrl(p({ thumbnail: 'httpsfoo', relativeDir: 'dir' })),
  ).toBe('/posts/dir/httpsfoo');
  expect(
    resolveAbsoluteThumbnailUrl(
      p({ thumbnail: 'http2-flow.png', relativeDir: 'network' }),
    ),
  ).toBe(`${SITE_URL}/posts/network/http2-flow.png`);
  expect(isOptimizableThumbnail('http2-flow.png')).toBe(true);
});

test('resolveThumbnailUrl: 스킴이 있는 값과 프로토콜 상대 URL은 그대로', () => {
  for (const url of [
    'https://cdn.example.com/a.png',
    'data:image/png;base64,AAAA',
    '//cdn.example.com/a.png',
  ]) {
    expect(resolveThumbnailUrl(p({ thumbnail: url, relativeDir: 'dir' }))).toBe(
      url,
    );
  }
});

test('resolveAbsoluteThumbnailUrl: 프로토콜 상대 URL에는 사이트 스킴만 붙인다', () => {
  expect(
    resolveAbsoluteThumbnailUrl(p({ thumbnail: '//cdn.example.com/a.png' })),
  ).toBe(`${new URL(SITE_URL).protocol}//cdn.example.com/a.png`);
});

test('resolveAbsoluteThumbnailUrl: 생성된 OG 카드에 SITE_URL prefix', () => {
  expect(resolveAbsoluteThumbnailUrl(p({}))).toBe(`${SITE_URL}/og/my-post.png`);
});

test('resolveAbsoluteThumbnailUrl: slug 없으면 기본 OG 이미지에 SITE_URL prefix', () => {
  expect(resolveAbsoluteThumbnailUrl(p({ slug: '' }))).toBe(
    `${SITE_URL}${OG_DEFAULT_IMAGE}`,
  );
});

test('resolveAbsoluteThumbnailUrl: 슬래시 절대 경로에는 SITE_URL prefix', () => {
  expect(resolveAbsoluteThumbnailUrl(p({ thumbnail: '/abs/x.png' }))).toBe(
    `${SITE_URL}/abs/x.png`,
  );
});

test('resolveAbsoluteThumbnailUrl: 상대 경로 결과에 SITE_URL prefix (한글 인코딩 포함)', () => {
  expect(
    resolveAbsoluteThumbnailUrl(
      p({ thumbnail: 'cover.png', relativeDir: '번들러/3편' }),
    ),
  ).toBe(`${SITE_URL}/posts/${ENC_BUNDLER}/${ENC_3PYEON}/cover.png`);
});

test('resolveAbsoluteThumbnailUrl: https URL은 prefix 없이 그대로', () => {
  expect(
    resolveAbsoluteThumbnailUrl(p({ thumbnail: 'https://cdn/x.png' })),
  ).toBe('https://cdn/x.png');
});

test('resolveAbsoluteThumbnailUrl: http URL은 prefix 없이 그대로', () => {
  expect(
    resolveAbsoluteThumbnailUrl(
      p({ thumbnail: 'http://example.com/x.png', relativeDir: 'dir' }),
    ),
  ).toBe('http://example.com/x.png');
});

// ── isOptimizableThumbnail ───────────────────────────────────────────────────

test('isOptimizableThumbnail: posts/ 상대 png/jpg/jpeg만 대상', () => {
  expect(isOptimizableThumbnail('a-thumb.png')).toBe(true);
  expect(isOptimizableThumbnail('a.jpg')).toBe(true);
  expect(isOptimizableThumbnail('a.jpeg')).toBe(true);
  expect(isOptimizableThumbnail('A-THUMB.PNG')).toBe(true);
});

test('isOptimizableThumbnail: 생성 OG 카드·절대 경로·외부 URL은 제외', () => {
  expect(isOptimizableThumbnail('/og/my-post.png')).toBe(false);
  expect(isOptimizableThumbnail('/other/x.png')).toBe(false);
  expect(isOptimizableThumbnail('https://cdn/x.png')).toBe(false);
  expect(isOptimizableThumbnail('http://cdn/x.png')).toBe(false);
});

test('isOptimizableThumbnail: 없거나 변환 대상 아닌 확장자는 제외', () => {
  expect(isOptimizableThumbnail(undefined)).toBe(false);
  expect(isOptimizableThumbnail('')).toBe(false);
  expect(isOptimizableThumbnail('x.svg')).toBe(false);
  expect(isOptimizableThumbnail('x.webp')).toBe(false);
  expect(isOptimizableThumbnail('x.gif')).toBe(false);
});

// ── thumbnailWebpRelPath ─────────────────────────────────────────────────────

test('thumbnailWebpRelPath: relativeDir을 붙이고 확장자를 webp로 교체', () => {
  expect(
    thumbnailWebpRelPath(
      p({ thumbnail: 'a-thumb.png', relativeDir: 'bundler' }),
    ),
  ).toBe('bundler/a-thumb.webp');
});

test('thumbnailWebpRelPath: relativeDir이 비면 파일명만 (인코딩하지 않은 원시 경로)', () => {
  expect(
    thumbnailWebpRelPath(p({ thumbnail: 'a.jpeg', relativeDir: '' })),
  ).toBe('a.webp');
});

test('thumbnailWebpRelPath: 대상이 아니면 null', () => {
  expect(thumbnailWebpRelPath(p({ thumbnail: '/og/x.png' }))).toBe(null);
  expect(thumbnailWebpRelPath(p({}))).toBe(null);
});

// ── resolveThumbnailSrc ──────────────────────────────────────────────────────

test('resolveThumbnailSrc: 상대 png는 /thumbs/ 아래 webp로', () => {
  expect(
    resolveThumbnailSrc(
      p({ thumbnail: 'a-thumb.png', relativeDir: 'bundler' }),
    ),
  ).toBe('/thumbs/bundler/a-thumb.webp');
});

test('resolveThumbnailSrc: 한글 relativeDir은 세그먼트별 인코딩 (구분자 보존)', () => {
  expect(
    resolveThumbnailSrc(p({ thumbnail: 'a.png', relativeDir: '번들러/3편' })),
  ).toBe(`/thumbs/${ENC_BUNDLER}/${ENC_3PYEON}/a.webp`);
});

test('resolveThumbnailSrc: 대상이 아니면 resolveThumbnailUrl과 같은 결과', () => {
  // 생성 OG 카드
  expect(resolveThumbnailSrc(p({}))).toBe('/og/my-post.png');
  // 외부 URL
  expect(resolveThumbnailSrc(p({ thumbnail: 'https://cdn/x.png' }))).toBe(
    'https://cdn/x.png',
  );
  // 절대 경로
  expect(resolveThumbnailSrc(p({ thumbnail: '/og/other.png' }))).toBe(
    '/og/other.png',
  );
});

test('resolveThumbnailSrc·thumbnailWebpRelPath: 하위 경로와 ./도 같은 경로를 가리킨다', () => {
  // 화면이 여는 /thumbs 경로와 생성기가 쓰는 파일 경로가 같은 모양이어야 한다
  // (예전에는 'img%2Fcover.webp'를 열고 'network/img/cover.webp'를 썼다).
  const sub = p({ thumbnail: 'img/cover.png', relativeDir: 'network' });
  expect(resolveThumbnailSrc(sub)).toBe('/thumbs/network/img/cover.webp');
  expect(thumbnailWebpRelPath(sub)).toBe('network/img/cover.webp');

  const dotted = p({ thumbnail: './cover.png', relativeDir: 'network' });
  expect(resolveThumbnailSrc(dotted)).toBe('/thumbs/network/cover.webp');
  expect(thumbnailWebpRelPath(dotted)).toBe('network/cover.webp');
});

test('resolveThumbnailSrc: 파일명의 공백은 인코딩', () => {
  expect(
    resolveThumbnailSrc(p({ thumbnail: 'my thumb.png', relativeDir: 'dir' })),
  ).toBe('/thumbs/dir/my%20thumb.webp');
});
