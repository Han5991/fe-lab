import { describe, expect, test } from 'vitest';
import {
  buildPostMetadata,
  buildPostJsonLd,
  buildBreadcrumbJsonLd,
  buildDescription,
  toKstIsoDate,
  countWords,
  type SeoPost,
} from './postSeo';

// lib/constants: SITE_URL='https://blog.sangwook.dev', OG_DEFAULT_IMAGE='/og-default.png'
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

  test('excerpt가 없으면 본문 160자 + "..."', () => {
    const d = buildDescription({
      excerpt: undefined,
      content: '가'.repeat(200),
    });
    expect(d).toBe('가'.repeat(160) + '...');
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

  test('openGraph: article + publishedTime + 1200x630 이미지', () => {
    const og = buildPostMetadata(makePost({ date: '2025-01-02' }), 'a')
      .openGraph as Record<string, unknown>;
    expect(og.type).toBe('article');
    expect(og.publishedTime).toBe('2025-01-02');
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

  test('thumbnail 없으면 OG 기본 이미지 사용', () => {
    const m = buildPostMetadata(makePost({ thumbnail: undefined }), 'a');
    expect(JSON.stringify(m.openGraph)).toContain('/og-default.png');
  });

  test('상대 thumbnail은 절대 URL(SITE_URL prefix)로 변환', () => {
    const m = buildPostMetadata(
      makePost({ thumbnail: 'cover.png', relativeDir: '번들러' }),
      'a',
    );
    expect(JSON.stringify(m.openGraph)).toContain(`${SITE}/posts/`);
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
