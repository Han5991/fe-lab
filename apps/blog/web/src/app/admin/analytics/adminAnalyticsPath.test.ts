import { describe, expect, it } from 'vitest';
import { postPath } from '@blog/content';
import {
  ADMIN_ANALYTICS_PATH,
  adminAnalyticsPostPath,
} from './adminAnalyticsPath';
import { slugFromParams } from './[...slug]/slugFromParams';

/** 링크가 만든 경로를 라우트가 useParams()로 받는 모양(인코딩된 세그먼트 배열)으로 되돌린다. */
const segmentsOf = (path: string) =>
  path.slice(ADMIN_ANALYTICS_PATH.length).replace(/\/$/, '').split('/');

describe('adminAnalyticsPostPath', () => {
  it('ASCII slug는 후행 슬래시를 달아 상세 경로가 된다', () => {
    expect(adminAnalyticsPostPath('cache-hit-cold-build')).toBe(
      '/admin/analytics/cache-hit-cold-build/',
    );
  });

  it('`.`이 든 slug도 후행 슬래시를 유지한다 (postPath와 같은 계약)', () => {
    expect(adminAnalyticsPostPath('turborepo-next.js-docker')).toBe(
      '/admin/analytics/turborepo-next.js-docker/',
    );
  });

  it('한글·공백은 인코딩하고 폴더 경로의 `/`는 세그먼트 구분자로 남긴다 — postPath와 같은 규칙', () => {
    const slug = '회고/2025 상반기';
    expect(adminAnalyticsPostPath(slug)).toBe(
      `/admin/analytics/${encodeURIComponent('회고')}/${encodeURIComponent('2025 상반기')}/`,
    );
    // 공개 글 상세와 인코딩 규칙이 같다(prefix만 다르다).
    expect(
      adminAnalyticsPostPath(slug).slice(ADMIN_ANALYTICS_PATH.length),
    ).toBe(postPath(slug).slice('/posts/'.length));
  });

  it('링크 → 라우트 왕복: 만든 경로의 세그먼트를 slugFromParams에 넣으면 원래 slug가 나온다', () => {
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
