import { describe, expect, test } from 'vitest';
import {
  buildPostMetadata,
  buildPostJsonLd,
  buildBreadcrumbJsonLd,
  buildDescription,
  resolveSeoTitle,
  toKstIsoDate,
  countWords,
  type SeoPost,
} from './postSeo';

// lib/constants: SITE_URL='https://blog.sangwook.dev', OG_DEFAULT_IMAGE='/og-default.jpg'
const SITE = 'https://blog.sangwook.dev';

function makePost(over: Partial<SeoPost> = {}): SeoPost {
  return {
    title: '테스트 글',
    excerpt: '요약',
    content: '본문 내용입니다',
    date: '2025-01-02',
    updatedAt: null,
    thumbnail: undefined,
    relativeDir: '',
    tags: undefined,
    series: undefined,
    ...over,
  };
}

describe('buildDescription', () => {
  test('excerpt가 있으면 그대로', () => {
    expect(buildDescription({ excerpt: '요약문', content: 'x' })).toBe(
      '요약문',
    );
  });

  test('excerpt가 없고 본문이 160자 초과면 160자 + "..."', () => {
    const d = buildDescription({
      excerpt: undefined,
      content: '가'.repeat(200),
    });
    expect(d).toBe('가'.repeat(160) + '...');
  });

  test('excerpt가 없고 본문이 160자 이하면 "..." 없이 그대로', () => {
    expect(buildDescription({ excerpt: undefined, content: '짧은 본문' })).toBe(
      '짧은 본문',
    );
  });
});

describe('toKstIsoDate', () => {
  test('YYYY-MM-DD → KST ISO', () => {
    expect(toKstIsoDate('2025-01-02')).toBe('2025-01-02T00:00:00+09:00');
  });

  test('null/undefined → undefined', () => {
    expect(toKstIsoDate(null)).toBeUndefined();
    expect(toKstIsoDate(undefined)).toBeUndefined();
  });

  test('offset 포함 full-ISO는 suffix 없이 그대로 반환 (invalid ISO 방지)', () => {
    // validate-posts가 권장하는 형식 — suffix를 덧붙이면
    // '...+09:00T00:00:00+09:00' 같은 깨진 값이 됐던 회귀 케이스
    expect(toKstIsoDate('2026-05-24T09:00:00+09:00')).toBe(
      '2026-05-24T09:00:00+09:00',
    );
    expect(toKstIsoDate('2026-05-24T00:00:00Z')).toBe('2026-05-24T00:00:00Z');
  });
});

describe('buildPostMetadata: full-ISO date', () => {
  test('publishedTime도 full-ISO date를 그대로 사용', () => {
    const og = buildPostMetadata(
      makePost({ date: '2026-05-24T09:00:00+09:00' }),
      'a',
    ).openGraph as Record<string, unknown>;
    expect(og.publishedTime).toBe('2026-05-24T09:00:00+09:00');
  });
});

describe('countWords', () => {
  test('마크다운 기호 제거 후 단어 수', () => {
    // '# 제목 **굵게** [링크](url)' → '제목 굵게 링크url' → 3단어
    expect(countWords('# 제목 **굵게** [링크](url)')).toBe(3);
  });

  test('연속 공백/개행은 1단어로 압축', () => {
    expect(countWords('한\n\n둘   셋')).toBe(3);
  });

  test('빈 본문은 0', () => {
    expect(countWords('   ')).toBe(0);
  });
});

describe('buildPostMetadata', () => {
  test('title / description / canonical', () => {
    const m = buildPostMetadata(makePost(), '번들러/3편');
    expect(m.title).toBe('테스트 글 | Frontend Lab');
    expect(m.description).toBe('요약');
    expect(m.alternates?.canonical).toBe('/posts/번들러/3편/');
  });

  test('seoTitle이 있으면 <title>만 그것을 쓴다 (og:title은 원래 제목)', () => {
    // 잘림이 문제인 건 SERP의 <title> 하나뿐이라, 공유 카드·화면 제목에는
    // 글의 원래 제목이 그대로 나가야 한다.
    const post = makePost({
      title: '[Typescript로 설계하는 프로젝트] 아주 긴 원래 제목',
      seoTitle: '[TS 설계] 짧은 제목',
    });
    const m = buildPostMetadata(post, 'a');
    expect(m.title).toBe('[TS 설계] 짧은 제목 | Frontend Lab');
    const og = m.openGraph as Record<string, unknown>;
    expect(og.title).toBe('[Typescript로 설계하는 프로젝트] 아주 긴 원래 제목');
  });

  test('seoTitle이 있어도 JSON-LD headline은 원래 제목', () => {
    const jsonLd = buildPostJsonLd(
      makePost({ title: '원래 제목', seoTitle: '짧은 제목' }),
      'a',
    );
    expect(jsonLd.headline).toBe('원래 제목');
  });

  test('og:site_name은 사이트 상수 하나에서 온다 (홈/목록과 동일)', () => {
    const og = buildPostMetadata(makePost(), 'a').openGraph as Record<
      string,
      unknown
    >;
    expect(og.siteName).toBe('Frontend Lab');
  });

  test('og:locale이 모든 글에 붙는다', () => {
    const og = buildPostMetadata(makePost(), 'a').openGraph as Record<
      string,
      unknown
    >;
    expect(og.locale).toBe('ko_KR');
  });

  test('openGraph: article + publishedTime + 1200x630 이미지', () => {
    const og = buildPostMetadata(makePost({ date: '2025-01-02' }), 'a')
      .openGraph as Record<string, unknown>;
    expect(og.type).toBe('article');
    // JSON-LD의 datePublished와 동일한 KST ISO 8601 형식
    expect(og.publishedTime).toBe('2025-01-02T00:00:00+09:00');
    expect(og.url).toBe('/posts/a/');
    const img = (og.images as Array<Record<string, unknown>>)[0];
    expect(img.width).toBe(1200);
    expect(img.height).toBe(630);
    expect(img.alt).toBe('테스트 글');
  });

  test('twitter: summary_large_image', () => {
    const tw = buildPostMetadata(makePost(), 'a').twitter as Record<
      string,
      unknown
    >;
    expect(tw.card).toBe('summary_large_image');
    expect(tw.title).toBe('테스트 글');
  });

  test('publishedTime: date 없으면 undefined', () => {
    const og = buildPostMetadata(makePost({ date: null }), 'a')
      .openGraph as Record<string, unknown>;
    expect(og.publishedTime).toBeUndefined();
  });

  test('thumbnail 없으면 OG images[0].url = 빌드 시 생성되는 글별 OG 카드', () => {
    const og = buildPostMetadata(makePost({ thumbnail: undefined }), 'a')
      .openGraph as Record<string, unknown>;
    const img = (og.images as Array<Record<string, unknown>>)[0];
    expect(img.url).toBe(`${SITE}/og/a.png`);
  });

  test('thumbnail 없는 한글/중첩 slug는 OG 이미지 URL이 세그먼트별 인코딩', () => {
    const og = buildPostMetadata(
      makePost({ thumbnail: undefined }),
      '번들러/3편',
    ).openGraph as Record<string, unknown>;
    const img = (og.images as Array<Record<string, unknown>>)[0];
    expect(img.url).toBe(
      `${SITE}/og/%EB%B2%88%EB%93%A4%EB%9F%AC/3%ED%8E%B8.png`,
    );
  });

  test('상대 thumbnail은 images[0].url이 절대 URL(SITE_URL prefix)', () => {
    const og = buildPostMetadata(
      makePost({ thumbnail: 'cover.png', relativeDir: '번들러' }),
      'a',
    ).openGraph as Record<string, unknown>;
    const img = (og.images as Array<Record<string, unknown>>)[0];
    expect(img.url as string).toMatch(new RegExp(`^${SITE}/posts/`));
    expect(img.url as string).toContain('cover.png');
  });
});

describe('buildPostJsonLd (Schema.org BlogPosting)', () => {
  test('기본 필드(headline / datePublished KST / url / 언어)', () => {
    const ld = buildPostJsonLd(makePost({ date: '2025-01-02' }), '번들러/3편');
    expect(ld['@type']).toBe('BlogPosting');
    expect(ld.headline).toBe('테스트 글');
    expect(ld.datePublished).toBe('2025-01-02T00:00:00+09:00');
    expect(ld.url).toBe(`${SITE}/posts/번들러/3편/`);
    expect(ld.inLanguage).toBe('ko');
    expect(ld.isAccessibleForFree).toBe(true);
  });

  test('dateModified: updatedAt 있으면 그것, 없으면 date', () => {
    const withUpdated = buildPostJsonLd(
      makePost({ date: '2025-01-02', updatedAt: '2025-03-03' }),
      'a',
    );
    expect(withUpdated.dateModified).toBe('2025-03-03T00:00:00+09:00');
    const noUpdated = buildPostJsonLd(
      makePost({ date: '2025-01-02', updatedAt: null }),
      'a',
    );
    expect(noUpdated.dateModified).toBe('2025-01-02T00:00:00+09:00');
  });

  test('keywords: tags 있으면 join, 없거나 빈 배열이면 키 자체가 없음', () => {
    expect(buildPostJsonLd(makePost({ tags: ['a', 'b'] }), 'x').keywords).toBe(
      'a, b',
    );
    expect(
      'keywords' in buildPostJsonLd(makePost({ tags: undefined }), 'x'),
    ).toBe(false);
    expect('keywords' in buildPostJsonLd(makePost({ tags: [] }), 'x')).toBe(
      false,
    );
  });

  test('articleSection: series 있으면 반영, 없으면 키 없음', () => {
    expect(
      buildPostJsonLd(makePost({ series: '번들러' }), 'x').articleSection,
    ).toBe('번들러');
    expect(
      'articleSection' in buildPostJsonLd(makePost({ series: undefined }), 'x'),
    ).toBe(false);
  });

  test('wordCount는 countWords 결과', () => {
    expect(
      buildPostJsonLd(makePost({ content: '한 둘 셋' }), 'x').wordCount,
    ).toBe(3);
  });

  test('author/publisher 고정 식별값', () => {
    const ld = buildPostJsonLd(makePost(), 'x');
    expect((ld.author as Record<string, unknown>).name).toBe('Sangwook Han');
    expect((ld.publisher as Record<string, unknown>).name).toBe('Frontend Lab');
    expect((ld.image as Record<string, unknown>).width).toBe(1200);
  });
});

describe('buildBreadcrumbJsonLd', () => {
  test('Home > Posts > 글제목 3단계', () => {
    const bc = buildBreadcrumbJsonLd({ title: '테스트 글' }, '번들러/3편');
    expect(bc['@type']).toBe('BreadcrumbList');
    const items = bc.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      position: 1,
      name: 'Home',
      item: `${SITE}/`,
    });
    expect(items[1]).toMatchObject({ position: 2, name: 'Posts' });
    expect(items[2]).toMatchObject({
      position: 3,
      name: '테스트 글',
      item: `${SITE}/posts/번들러/3편/`,
    });
  });
});

describe('resolveSeoTitle', () => {
  test('seoTitle이 있으면 seoTitle', () => {
    expect(resolveSeoTitle({ title: '길다', seoTitle: '짧다' })).toBe('짧다');
  });

  test('seoTitle이 없으면 title', () => {
    expect(resolveSeoTitle({ title: '길다', seoTitle: undefined })).toBe(
      '길다',
    );
  });
});

describe('buildDescription: 도메인 폴백 재사용', () => {
  test('평문이 없는 본문에서도 마크다운 기호가 새지 않는다', () => {
    // 예전에는 마크다운 원문을 그대로 잘라, 이미지·코드만 있는 글의 description이
    // `![](...)` 같은 기호로 채워졌다.
    const d = buildDescription({
      excerpt: undefined,
      content: '![](./a.png)\n\n```ts\ncode\n```',
    });
    expect(d).not.toContain('![');
    expect(d).not.toContain('```');
  });

  test('parsePost가 만드는 excerpt와 같은 규칙', () => {
    const content = '가'.repeat(300);
    expect(buildDescription({ excerpt: undefined, content })).toBe(
      '가'.repeat(160) + '...',
    );
  });
});
