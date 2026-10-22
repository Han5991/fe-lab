import { expect, test } from 'vitest';
import { localeLanguage, localeTag } from './locale.ts';

test.each([
  ['ko_KR', 'ko', 'ko-KR'],
  ['en_US', 'en', 'en-US'],
] as const)('%s → 언어 %s · BCP 47 %s', (locale, language, tag) => {
  expect(localeLanguage(locale)).toBe(language);
  expect(localeTag(locale)).toBe(tag);
});

// admin 화면이 toLocaleString에 이 값을 그대로 넘긴다 — og:locale 형식(ko_KR)이 새면
// RangeError로 화면이 에러 경계에 떨어진다.
test('localeTag는 Intl이 받는 태그다', () => {
  expect(() => new Intl.DateTimeFormat(localeTag('ko_KR'))).not.toThrow();
  expect(() => new Intl.DateTimeFormat('ko_KR')).toThrow(RangeError);
});
