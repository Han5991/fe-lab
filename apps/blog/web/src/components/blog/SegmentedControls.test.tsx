/**
 * 아카이브 필터의 정렬·뷰 컨트롤은 **이름 있는 라디오 그룹**이다.
 *
 * 예전엔 정렬이 `<ul role="radiogroup">`이라 `<li>`가 부모 없는 목록 항목으로
 * 남았고(axe listitem), 뷰는 tabpanel 없는 tablist였다. 둘 다 그룹 이름이 없었고
 * 화살표 키가 먹지 않았다.
 */
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SortRadio } from './SortRadio';
import { ViewToggle } from './ViewToggle';

describe('SortRadio', () => {
  test('"정렬" 이름의 라디오 그룹이고 목록 항목이 없다', () => {
    render(<SortRadio value="recent" onChange={vi.fn()} />);

    const group = screen.getByRole('radiogroup', { name: '정렬' });
    expect(group).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('radio', { name: '최신순' })).toBeChecked();
  });

  test('선택된 칸만 Tab 순서에 있다', () => {
    render(<SortRadio value="popular" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: '인기순' })).toHaveAttribute(
      'tabindex',
      '0',
    );
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
  test('"뷰" 이름의 라디오 그룹이고 탭 역할이 없다', () => {
    render(<ViewToggle value="cards" onChange={vi.fn()} />);

    expect(screen.getByRole('radiogroup', { name: '뷰' })).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByRole('radio', { name: '카드' })).toBeChecked();
  });

  test('화살표로 다른 보기를 고른다', () => {
    const onChange = vi.fn();
    render(<ViewToggle value="cards" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('radio', { name: '카드' }), {
      key: 'ArrowLeft',
    });

    expect(onChange).toHaveBeenCalledWith('list');
  });
});
