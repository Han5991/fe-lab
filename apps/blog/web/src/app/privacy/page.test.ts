import { describe, expect, test } from 'vitest';
import { SITE_URL } from '@/content.values.mts';
import { PRIVACY_PATH } from '@/src/shared/routes';
import { metadata } from './page';

// Next의 메타데이터 병합은 얕다 — 페이지가 openGraph를 비워 두면 루트의 것이
// 통째로 상속돼, /privacy/를 공유한 카드가 홈 제목·홈 주소를 달고 나갔다.
describe('/privacy 공유 메타데이터', () => {
  test('og:url·og:title이 홈이 아니라 이 페이지 값이다', () => {
    expect(metadata.openGraph?.url).toBe(`${SITE_URL}${PRIVACY_PATH}`);
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.twitter?.title).toBe(metadata.title);
  });

  test('카드 이미지를 잃지 않는다', () => {
    expect(metadata.openGraph?.images).toBeDefined();
    expect(metadata.twitter?.images).toBeDefined();
  });
});
