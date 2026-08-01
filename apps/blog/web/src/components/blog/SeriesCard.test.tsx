/**
 * 시리즈 카드가 시리즈로 필터된 아카이브로 연결되는지 고정합니다.
 *
 * `series.id`는 폴더명 그대로라 `[Typescript로 설계하는 프로젝트]`처럼 대괄호와
 * 공백이 섞여 있습니다. 인코딩이 빠지면 링크가 깨지므로 회귀로 막아둡니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeriesCard } from './SeriesCard';
import type { SeriesSummary } from '@/domain/post/aggregate';

const series = (overrides: Partial<SeriesSummary> = {}): SeriesSummary => ({
  id: 'bundler',
  title: '번들러 만들기',
  count: 5,
  updated: '2025-03-31',
  colorKey: 'accent',
  ...overrides,
});

describe('SeriesCard', () => {
  test('제목·편수·갱신일을 보여준다', () => {
    render(<SeriesCard series={series()} index={0} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      '번들러 만들기',
    );
    expect(screen.getByRole('link')).toHaveTextContent('5편');
    expect(screen.getByRole('link')).toHaveTextContent('2025-03-31 업데이트');
  });

  test('시리즈 id를 인코딩해 아카이브 필터로 연결한다', () => {
    render(
      <SeriesCard
        series={series({ id: '[Typescript로 설계하는 프로젝트]' })}
        index={1}
      />,
    );

    // next/link는 테스트 환경에서 trailingSlash 설정을 모르므로 후행 슬래시가
    // 붙었다 떨어졌다 한다. 문자열 전체 대신 "어디로/무슨 값으로" 가는지만 본다.
    const href = screen.getByRole('link').getAttribute('href') ?? '';
    const url = new URL(href, 'https://blog.sangwook.dev');

    expect(url.pathname.replace(/\/$/, '')).toBe('/posts');
    expect(url.searchParams.get('series')).toBe(
      '[Typescript로 설계하는 프로젝트]',
    );
  });

  test('설명이 없으면 설명 문단을 렌더하지 않는다', () => {
    const { container } = render(
      <SeriesCard series={series({ description: undefined })} index={0} />,
    );

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  test('갱신일이 없으면 업데이트 표기를 생략한다', () => {
    render(<SeriesCard series={series({ updated: null })} index={0} />);

    expect(screen.getByRole('link')).not.toHaveTextContent('업데이트');
  });
});
