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
  // 칩 이름은 "해제"를 말한다. 시리즈 칩은 URL의 id(폴더 경로)가 아니라 제목이다.
  test('칩마다 이름에 해제를 말하고, 누르면 그 필터를 푼다', () => {
    const h = handlers();
    render(
      <ActiveFilters
        tags={['react']}
        seriesLabel="우아한 에러 처리"
        year="2026"
        {...h}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '#react 필터 해제' }));
    fireEvent.click(
      screen.getByRole('button', { name: '우아한 에러 처리 필터 해제' }),
    );
    fireEvent.click(screen.getByRole('button', { name: '2026 필터 해제' }));

    expect(h.onRemoveTag).toHaveBeenCalledWith('react');
    expect(h.onClearSeries).toHaveBeenCalledOnce();
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
