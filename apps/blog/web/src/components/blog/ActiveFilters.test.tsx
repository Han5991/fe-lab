import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActiveFilters } from './ActiveFilters';

describe('ActiveFilters', () => {
  // 태그 버튼 이름은 "해제"를 말한다 — 누르면 그 필터가 풀린다.
  test('태그마다 이름에 해제를 말하고, 누르면 그 태그를, 모두 지우기는 전부를 푼다', () => {
    const onRemoveTag = vi.fn();
    const onClearAll = vi.fn();
    render(
      <ActiveFilters
        tags={['react', 'vitest']}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />,
    );

    expect(
      screen.getByRole('group', { name: '적용된 필터' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '#react 필터 해제' }));
    fireEvent.click(screen.getByRole('button', { name: '모두 지우기' }));

    expect(onRemoveTag).toHaveBeenCalledWith('react');
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  test('걸린 태그가 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(
      <ActiveFilters tags={[]} onRemoveTag={vi.fn()} onClearAll={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
