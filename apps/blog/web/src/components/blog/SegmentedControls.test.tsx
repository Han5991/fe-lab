/** 아카이브 필터의 정렬·뷰 컨트롤은 화살표 키가 먹는 이름 있는 라디오 그룹이다. */
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SortRadio } from './SortRadio';
import { ViewToggle } from './ViewToggle';

describe('SortRadio', () => {
  test('"정렬" 이름의 라디오 그룹이고 목록 항목이 없으며, 선택된 칸만 Tab 순서에 있다', () => {
    render(<SortRadio value="popular" onChange={vi.fn()} />);

    expect(
      screen.getByRole('radiogroup', { name: '정렬' }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    const popular = screen.getByRole('radio', { name: '인기순' });
    expect(popular).toBeChecked();
    expect(popular).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: '최신순' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  test('화살표가 선택과 초점을 옮기고 끝에서 돈다', () => {
    const onChange = vi.fn();
    render(<SortRadio value="shortest" onChange={onChange} />);
    const last = screen.getByRole('radio', { name: '짧은 글부터' });

    fireEvent.keyDown(last, { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledWith('recent');
    expect(screen.getByRole('radio', { name: '최신순' })).toHaveFocus();
  });
});

describe('ViewToggle', () => {
  test('"뷰" 이름의 라디오 그룹이고 탭 역할이 없으며, 화살표로 다른 보기를 고른다', () => {
    const onChange = vi.fn();
    render(<ViewToggle value="cards" onChange={onChange} />);

    expect(screen.getByRole('radiogroup', { name: '뷰' })).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    const cards = screen.getByRole('radio', { name: '카드' });
    expect(cards).toBeChecked();

    fireEvent.keyDown(cards, { key: 'ArrowLeft' });

    expect(onChange).toHaveBeenCalledWith('list');
  });
});
