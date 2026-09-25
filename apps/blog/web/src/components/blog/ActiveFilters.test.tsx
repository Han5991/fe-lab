import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActiveFilters } from './ActiveFilters';

const handlers = () => ({
  onRemoveTag: vi.fn(),
  onClearSeries: vi.fn(),
  onClearYear: vi.fn(),
  onClearAll: vi.fn(),
});

describe('ActiveFilters', () => {
  // URL에는 시리즈 id(폴더 경로)가 실린다. 예전엔 그 id가 칩에 그대로 찍혔다.
  test('시리즈 칩은 넘겨받은 제목을 보인다', () => {
    render(
      <ActiveFilters
        tags={[]}
        seriesLabel="우아한 에러 처리"
        year={null}
        {...handlers()}
      />,
    );

    expect(
      screen.getByRole('button', { name: '우아한 에러 처리 필터 해제' }),
    ).toBeInTheDocument();
  });

  test('칩 이름은 "해제"를 말하고, 누르면 그 필터를 푼다', () => {
    const h = handlers();
    render(
      <ActiveFilters tags={['react']} seriesLabel={null} year="2026" {...h} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '#react 필터 해제' }));
    fireEvent.click(screen.getByRole('button', { name: '2026 필터 해제' }));

    expect(h.onRemoveTag).toHaveBeenCalledWith('react');
    expect(h.onClearYear).toHaveBeenCalledOnce();
  });

  test('활성 필터가 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(
      <ActiveFilters
        tags={[]}
        seriesLabel={null}
        year={null}
        {...handlers()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
