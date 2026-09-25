/**
 * SEO 빌더의 날짜 계약 — 깨진 ISO를 내보내지 않는다.
 *
 * 빌더 전체의 출력 계약은 앱 쪽 `postSeo.test.ts`가 잠근다. 여기는 패키지가
 * 스스로 지켜야 하는 불변식(어떤 입력이 와도 datePublished·dateModified·
 * publishedTime은 유효한 ISO 8601이거나 생략)만 본다.
 */
import { expect, test } from 'vitest';
import { isIsoDateTimeWithOffset } from '../shared/dates.ts';
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

test('toKstIsoDate: 날짜만 → 설정 타임존 자정, offset 포함 ISO → 그대로', () => {
  expect(toKstIsoDate('2026-05-04', OFFSET)).toBe(
    `2026-05-04T00:00:00${OFFSET}`,
  );
  expect(toKstIsoDate('2026-05-04T09:00:00+09:00', OFFSET)).toBe(
    '2026-05-04T09:00:00+09:00',
  );
});

test.each([
  ['2026-5-4'],
  ['2026/05/04'],
  ['2026-03-16 09:00:00+09:00'],
  ['2026-06-01T09:00:00'],
  ['2026-02-30'],
])(
  "toKstIsoDate: 형식 밖의 값('%s')은 undefined — 깨진 ISO를 만들지 않는다",
  value => {
    expect(toKstIsoDate(value, OFFSET)).toBe(undefined);
  },
);

test('toKstIsoDate: offset 형식이 틀리면 날짜만 값도 undefined', () => {
  expect(toKstIsoDate('2026-05-04', '+9:00')).toBe(undefined);
});

test('buildPostJsonLd: 날짜 필드는 유효한 ISO이거나 생략된다', () => {
  const ld = buildPostJsonLd(
    makePost({ date: '2026-5-4', updatedAt: '2026/05/05' }),
    'a',
  );
  expect(ld['datePublished']).toBe(undefined);
  expect(ld['dateModified']).toBe(undefined);

  const og = buildPostSeo(makePost({ date: '2026-5-4' }), 'a').openGraph;
  expect(og.publishedTime).toBe(undefined);
});

test('buildPostJsonLd: updatedAt이 틀리면 date로 폴백한다', () => {
  const ld = buildPostJsonLd(
    makePost({ date: '2026-05-04', updatedAt: '2026-5-5' }),
    'a',
  );
  const modified = ld['dateModified'];
  expect(
    typeof modified === 'string' && isIsoDateTimeWithOffset(modified),
  ).toBe(true);
  expect(modified).toBe(`2026-05-04T00:00:00${OFFSET}`);
});
