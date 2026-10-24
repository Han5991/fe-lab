/**
 * admin 차트 툴팁 — Recharts 기본 툴팁을 대신하면서 그 스크린리더 알림을 잃지 않는다.
 * Cartesian 차트는 `accessibilityLayer`가 기본 true라, 기본 툴팁은 `role="status"`로
 * 값을 읽혔다. 커스텀 content가 그 값을 버리면 키보드 탐색에서 값이 조용히 사라진다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TooltipContentProps } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

function props(
  overrides: Partial<TooltipContentProps> = {},
): TooltipContentProps {
  return {
    active: true,
    label: '10/21',
    payload: [{ name: 'views', value: 42, graphicalItemId: 'line-views' }],
    coordinate: { x: 0, y: 0 },
    activeIndex: '0',
    accessibilityLayer: true,
    ...overrides,
  };
}

describe('ChartTooltip', () => {
  test('accessibilityLayer가 켜져 있으면 값을 status 영역으로 알린다', () => {
    render(<ChartTooltip {...props()} />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('assertive');
    expect(status.textContent).toContain('10/21');
    expect(status.textContent).toContain('views : 42');
  });

  test('accessibilityLayer가 꺼져 있으면 알림 영역을 만들지 않는다', () => {
    render(<ChartTooltip {...props({ accessibilityLayer: false })} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('views : 42')).toBeTruthy();
  });

  test('비활성이거나 payload가 비면 그리지 않는다', () => {
    const { container, rerender } = render(
      <ChartTooltip {...props({ active: false })} />,
    );
    expect(container.childElementCount).toBe(0);
    rerender(<ChartTooltip {...props({ payload: [] })} />);
    expect(container.childElementCount).toBe(0);
  });
});
