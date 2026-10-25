/**
 * 날짜 줄 — 날짜 | N분 읽기. 작성자 아바타·이름은 없다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AUTHOR_ALTERNATE_NAME } from '@/content.values.mts';
import { Dateline } from './Dateline';

describe('Dateline', () => {
  test('날짜·읽기 시간을 보인다', () => {
    render(<Dateline date="2026-09-18" readMin={20} />);

    expect(screen.getByText('2026-09-18')).toBeInTheDocument();
    expect(screen.getByText('20분 읽기')).toBeInTheDocument();
  });

  test('날짜는 time 요소다', () => {
    const { container } = render(<Dateline date="2026-09-18" readMin={1} />);

    expect(container.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-09-18',
    );
  });

  test('날짜가 없으면 그 칸째 빠진다', () => {
    const { container } = render(<Dateline date={null} readMin={3} />);

    expect(container.querySelector('time')).toBeNull();
    expect(screen.getByText('3분 읽기')).toBeInTheDocument();
  });

  test('(회귀) 작성자 이름과 이니셜 원은 없다', () => {
    const { container } = render(<Dateline date="2026-09-18" readMin={1} />);

    const initial = Array.from(AUTHOR_ALTERNATE_NAME)[0] ?? '';
    expect(container.textContent).not.toContain(initial);
  });
});
