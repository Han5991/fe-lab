/**
 * 세그먼트 — ARIA radiogroup: 탭 정지점은 선택된 항목 하나, 화살표가 선택과 초점을 함께 옮긴다.
 */
import { describe, expect, test } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: 'a', label: '가' },
  { value: 'b', label: '나' },
  { value: 'c', label: '다' },
] as const;

function Harness() {
  const [value, setValue] = useState<(typeof OPTIONS)[number]['value']>('a');
  return (
    <SegmentedControl
      label="보기"
      options={OPTIONS}
      value={value}
      onChange={setValue}
    />
  );
}

describe('SegmentedControl', () => {
  test('선택된 항목만 탭 정지점이고, 누르면 그 항목이 선택된다', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: '보기' });
    expect(group).toBeInTheDocument();

    expect(screen.getByRole('radio', { name: '가' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '가' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('radio', { name: '나' })).toHaveAttribute(
      'tabindex',
      '-1',
    );

    fireEvent.click(screen.getByRole('radio', { name: '다' }));
    expect(screen.getByRole('radio', { name: '다' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '가' })).not.toBeChecked();
  });

  test('화살표는 선택과 초점을 옮기고 양끝에서 돌아간다', () => {
    render(<Harness />);
    const first = screen.getByRole('radio', { name: '가' });

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: '나' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '나' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('radio', { name: '나' }), {
      key: 'ArrowLeft',
    });
    fireEvent.keyDown(screen.getByRole('radio', { name: '가' }), {
      key: 'ArrowLeft',
    });
    expect(screen.getByRole('radio', { name: '다' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '다' })).toHaveFocus();
  });
});
