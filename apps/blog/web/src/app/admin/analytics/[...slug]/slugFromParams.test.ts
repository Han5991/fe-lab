import { describe, expect, it } from 'vitest';
import { ADMIN_ANALYTICS_PATH, adminAnalyticsPostPath } from '@/shared/routes';
import { slugFromParams } from './slugFromParams';

/** 링크가 만든 경로를 라우트가 useParams()로 받는 모양(인코딩된 세그먼트 배열)으로 되돌린다. */
const segmentsOf = (path: string) =>
  path.slice(ADMIN_ANALYTICS_PATH.length).replace(/\/$/, '').split('/');

describe('slugFromParams', () => {
  it('ASCII slug는 그대로 통과한다', () => {
    expect(slugFromParams('cache-hit-cold-build')).toBe('cache-hit-cold-build');
  });

  it('인코딩된 한글 slug를 디코드한다 — post.slug(디코드 원문)와의 lookup 계약', () => {
    expect(slugFromParams(encodeURIComponent('한글-슬러그'))).toBe(
      '한글-슬러그',
    );
  });

  it('배열 세그먼트는 /로 잇고 디코드한다', () => {
    expect(slugFromParams([encodeURIComponent('회고'), '2024'])).toBe(
      '회고/2024',
    );
  });

  it('세그먼트가 없으면 빈 문자열', () => {
    expect(slugFromParams(undefined)).toBe('');
  });

  it('잘못된 percent-encoding은 던지지 않고 원문을 돌려준다 (lookup만 빗나가게)', () => {
    expect(() => slugFromParams('100%-done')).not.toThrow();
    expect(slugFromParams('100%-done')).toBe('100%-done');
    expect(slugFromParams(['a%', 'b'])).toBe('a%/b');
  });

  it('링크 → 라우트 왕복: adminAnalyticsPostPath가 만든 경로의 세그먼트를 넣으면 원래 slug가 나온다', () => {
    // 링크 쪽 인코딩(shared/routes의 adminAnalyticsPostPath)과 라우트 쪽
    // 디코드가 서로의 역함수임을 잠근다 — 한쪽만 바뀌면 한글·폴더 slug 글의
    // 통계 화면이 빈 placeholder로 떨어진다.
    for (const slug of [
      'cache-hit-cold-build',
      'turborepo-next.js-docker',
      '한글-슬러그',
      '회고/2025 상반기',
      'react/component/toast',
    ]) {
      expect(slugFromParams(segmentsOf(adminAnalyticsPostPath(slug)))).toBe(
        slug,
      );
    }
  });
});
