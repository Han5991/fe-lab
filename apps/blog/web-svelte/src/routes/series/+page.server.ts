import { getAllSeries } from '$lib/server/content';

/**
 * 시리즈 목록. `SeriesSummary`는 편수와 최신 갱신일까지만 준다 — 시리즈 안의
 * 글 목록·순서 내비게이션은 글 상세의 시리즈 nav가 맡을 일이라 여기서는 세지
 * 않는다(PR 5).
 */
export const load = () => ({
  series: getAllSeries().map(s => ({
    id: s.id,
    title: s.title,
    description: s.description ?? '',
    count: s.count,
    updated: s.updated,
  })),
});
