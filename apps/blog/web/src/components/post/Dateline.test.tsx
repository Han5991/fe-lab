/**
 * 바이라인 — 이름 | 날짜 | N분 읽기. 아바타 원은 이름의 첫 글자이고 장식이다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AUTHOR_ALTERNATE_NAME } from '@/content.values.mts';
import { Byline } from './Byline';

describe('Byline', () => {
  test('이름·날짜·읽기 시간을 보인다', () => {
    render(<Byline date="2026-09-18" readMin={20} />);

    expect(screen.getByText(AUTHOR_ALTERNATE_NAME)).toBeInTheDocument();
    expect(screen.getByText('2026-09-18')).toBeInTheDocument();
    expect(screen.getByText('20분 읽기')).toBeInTheDocument();
  });

  test('날짜는 time 요소다', () => {
    const { container } = render(<Byline date="2026-09-18" readMin={1} />);

    expect(container.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-09-18',
    );
  });

  test('날짜가 없으면 그 칸째 빠진다', () => {
    const { container } = render(<Byline date={null} readMin={3} />);

    expect(container.querySelector('time')).toBeNull();
    expect(screen.getByText('3분 읽기')).toBeInTheDocument();
  });

  test('아바타는 이름의 첫 글자이고 스크린리더에서 숨긴다', () => {
    render(<Byline date={null} readMin={1} />);

    const initial = Array.from(AUTHOR_ALTERNATE_NAME)[0] ?? '';
    const avatar = screen.getByText(initial, { selector: '[aria-hidden]' });
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });
});
