/** SEO 빌더의 날짜 계약 — 어떤 입력이 와도 날짜 필드는 유효한 ISO이거나 생략된다. */
import { expect, test } from 'vitest';
import { testConfig } from '../post/testing.ts';
import { createPostSeo, toKstIsoDate, type SeoPost } from './postSeo.ts';

const OFFSET = testConfig.timezone.isoOffset;
const { buildPostJsonLd, buildPostSeo } = createPostSeo(testConfig);

function makePost(over: Partial<SeoPost> = {}): SeoPost {
  return {
    title: '글',
    excerpt: '요약',
    content: '본문',
    date: '2026-05-04',
    updatedAt: null,
    relativeDir: '',
    ...over,
  };
}

test.each([
  ['2026-05-04', OFFSET, `2026-05-04T00:00:00${OFFSET}`],
  ['2026-05-04T09:00:00+09:00', OFFSET, '2026-05-04T09:00:00+09:00'],
  // 형식 밖의 값·틀린 offset은 깨진 ISO를 만들지 않고 생략한다
  ['2026-5-4', OFFSET, undefined],
  ['2026/05/04', OFFSET, undefined],
  ['2026-03-16 09:00:00+09:00', OFFSET, undefined],
  ['2026-06-01T09:00:00', OFFSET, undefined],
  ['2026-02-30', OFFSET, undefined],
  ['2026-05-04', '+9:00', undefined],
])('toKstIsoDate(%j, %j) → %j', (value, offset, expected) => {
  expect(toKstIsoDate(value, offset)).toBe(expected);
});

test('buildPostJsonLd·buildPostSeo: 날짜 필드는 유효한 ISO이거나 생략, updatedAt이 틀리면 date로 폴백', () => {
  const broken = buildPostJsonLd(
    makePost({ date: '2026-5-4', updatedAt: '2026/05/05' }),
    'a',
  );
  expect(broken['datePublished']).toBe(undefined);
  expect(broken['dateModified']).toBe(undefined);
  expect(
    buildPostSeo(makePost({ date: '2026-5-4' }), 'a').openGraph.publishedTime,
  ).toBe(undefined);

  const fallback = buildPostJsonLd(
    makePost({ date: '2026-05-04', updatedAt: '2026-5-5' }),
    'a',
  );
  expect(fallback['dateModified']).toBe(`2026-05-04T00:00:00${OFFSET}`);
});
