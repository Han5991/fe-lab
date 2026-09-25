import { describe, expect, test } from 'vitest';
import { slugFromSegments } from './slugFromSegments';

describe('slugFromSegments', () => {
  test('폴더 경로 세그먼트를 잇고 한글을 디코드한다', () => {
    expect(
      slugFromSegments([
        encodeURIComponent('시리즈'),
        encodeURIComponent('첫 글'),
      ]),
    ).toBe('시리즈/첫 글');
  });

  // 맨 decodeURIComponent는 여기서 URIError를 던져 라우트가 죽었다.
  test('잘못된 퍼센트 인코딩은 던지지 않고 원문 그대로', () => {
    expect(() => slugFromSegments(['100%-done'])).not.toThrow();
    expect(slugFromSegments(['100%-done'])).toBe('100%-done');
  });
});
