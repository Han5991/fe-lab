/**
 * 홈의 "시리즈로 읽기" 면.
 *
 * 링크는 아카이브의 시리즈 필터로 갑니다(`/posts/?series=`). 시리즈 id는
 * `[Typescript로 설계하는 프로젝트]`처럼 대괄호와 공백이 든 폴더명이라
 * 인코딩이 빠지면 쿼리가 깨집니다 — 여기서 고정합니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SeriesSummary } from '@/domain/post/aggregate';
import { SeriesBand } from './SeriesBand';

const series = (over: Partial<SeriesSummary> = {}): SeriesSummary => ({
  id: 'bundler',
  title: '누가 시키지도 않았는데 번들러 만들기',
  count: 5,
  updated: '2026-03-03',
  colorKey: 'accent',
  ...over,
});

describe('SeriesBand', () => {
  test('편수와 최근 발행일을 함께 보여준다', () => {
    render(<SeriesBand series={[series()]} labelledBy="band-series" />);
    expect(screen.getByText('5편')).toBeInTheDocument();
    expect(screen.getByText('최근 2026-03-03')).toBeInTheDocument();
  });

  test('시리즈 id를 인코딩해 아카이브 필터로 건다', () => {
    render(
      <SeriesBand
        series={[series({ id: '[Typescript로 설계하는 프로젝트]' })]}
        labelledBy="band-series"
      />,
    );
    // next/link가 테스트 환경에서 경로의 후행 슬래시를 떼므로 쿼리만 비교합니다.
    const href = screen.getByRole('link').getAttribute('href') ?? '';
    expect(href.startsWith('/posts')).toBe(true);
    expect(href).toContain(
      `series=${encodeURIComponent('[Typescript로 설계하는 프로젝트]')}`,
    );
  });

  test('limit을 넘는 시리즈는 자른다', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      series({ id: `s${i}`, title: `시리즈 ${i}` }),
    );
    render(<SeriesBand series={many} labelledBy="band-series" limit={3} />);
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  test('발행일이 없으면 최근 줄을 생략한다', () => {
    render(
      <SeriesBand
        series={[series({ updated: null })]}
        labelledBy="band-series"
      />,
    );
    expect(screen.queryByText(/^최근 /)).toBeNull();
  });

  test('시리즈가 없으면 목록 자체를 렌더하지 않는다', () => {
    const { container } = render(
      <SeriesBand series={[]} labelledBy="band-series" />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('목록이 밴드 라벨로 이름을 얻는다', () => {
    render(<SeriesBand series={[series()]} labelledBy="band-series" />);
    expect(screen.getByRole('list')).toHaveAttribute(
      'aria-labelledby',
      'band-series',
    );
  });
});
