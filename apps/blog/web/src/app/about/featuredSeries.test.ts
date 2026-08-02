/**
 * About "주요 시리즈" 카드가 가리키는 시리즈 id를 실제 콘텐츠와 대조해 잠급니다.
 *
 * 이 링크는 깨져도 화면에 아무 신호를 남기지 않습니다 — 아카이브가 그냥
 * "조건에 맞는 글이 없습니다"를 그린다. 실제로 `series=에러`(진짜 폴더명은
 * `우아하게 에러 핸들링 하기`)와 `series=typescript`(연재 폴더는
 * `[Typescript로 설계하는 프로젝트]`)가 그렇게 죽어 있었습니다.
 *
 * 그래서 상수만 보지 않고 `apps/blog/posts/`를 실제로 읽어 검증합니다.
 * 폴더 이름을 바꾸면 이 테스트가 먼저 깨집니다.
 */
import { describe, expect, test } from 'vitest';

import { getAllPostSummaries } from '@/domain/post';
import { getAllSeries } from '@/domain/post/aggregate';
import { filterAndSortPostsByArchiveParams } from '@/domain/post/filtering';

import { FEATURED_SERIES } from './featuredSeries';

describe('About 주요 시리즈 카드', () => {
  test('id는 모두 실제 시리즈 집합(getAllSeries)에 존재한다', () => {
    const known = new Set(getAllSeries().map(s => s.id));
    const unknown = FEATURED_SERIES.filter(s => !known.has(s.id)).map(
      s => s.id,
    );
    expect(unknown).toEqual([]);
  });

  test('카드 링크(?series=id)가 아카이브에서 1편 이상 매치된다', () => {
    // 페이지가 만드는 href와 같은 값이 아카이브 필터에 도달하는지까지 본다.
    // (PostsArchiveView는 nuqs로 받은 값을 그대로 이 함수에 넘긴다)
    const posts = getAllPostSummaries();
    for (const series of FEATURED_SERIES) {
      const seriesParam = decodeURIComponent(encodeURIComponent(series.id));
      const matched = filterAndSortPostsByArchiveParams(posts, {
        q: '',
        tags: [],
        series: seriesParam,
        year: null,
        sort: 'recent',
      });
      expect(
        matched.length,
        `${series.title} (series=${series.id})`,
      ).toBeGreaterThan(0);
    }
  });

  test('id가 중복되지 않는다', () => {
    const ids = FEATURED_SERIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
