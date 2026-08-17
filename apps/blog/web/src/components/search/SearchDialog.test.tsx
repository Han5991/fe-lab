/**
 * 검색 다이얼로그의 **선택 인덱스 계약.**
 *
 * 선택 인덱스는 "어느 검색어에 대한 선택인지"를 함께 들고 다닌다. 예전에는
 * query가 바뀔 때마다 effect가 0으로 되돌렸는데, 그러면 렌더 → effect → 리렌더가
 * 한 번 더 돌고 그 사이 한 프레임 동안 이전 검색어의 인덱스가 새 결과 위에
 * 얹힌다. 되돌리는 주체가 effect에서 렌더 중 판정으로 바뀌었으므로, 겉으로
 * 드러나는 계약 — 화살표로 옮긴 자리에서 Enter가 그 결과를 열고, 검색어를 바꾸면
 * 선택이 첫 결과로 돌아간다 — 을 여기서 고정한다.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { postPath } from '@blog/content';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

// 최근 본 글이 있으면 빈 검색어일 때 그 목록이 대신 뜬다. 선택 인덱스 계약과는
// 무관한 축이라 비워 두고, 목록은 아래 POSTS 하나로 고정한다.
vi.mock('@/src/hooks/useRecentViews', () => ({
  getRecentViews: () => [],
}));

import { SearchDialog } from './SearchDialog';

const post = (slug: string, title: string) => ({
  slug,
  title,
  date: '2026-01-01',
  excerpt: '',
  tags: [],
  series: null,
});

// '터보'로 거르면 앞의 둘만 남는다 — 화살표가 움직일 자리가 있어야 한다.
const POSTS = [
  post('turbo-a', '터보 첫 글'),
  post('turbo-b', '터보 둘째 글'),
  post('other', '전혀 다른 글'),
];

/** 다이얼로그를 열고 검색 인덱스가 도착할 때까지 기다린 뒤 입력창을 준다. */
const openDialog = async () => {
  render(<SearchDialog />);
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  // 검색 인덱스는 열릴 때 fetch로 불러온다.
  await screen.findByText('터보 첫 글');
  return screen.getByPlaceholderText('제목, 태그, 시리즈로 검색...');
};

beforeEach(() => {
  push.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ json: () => Promise.resolve(POSTS) })),
  );
  // jsdom에 없는 것 — 선택 항목을 목록 안으로 끌어오는 effect가 부른다.
  Element.prototype.scrollIntoView = vi.fn();
});

describe('SearchDialog - 선택 인덱스', () => {
  test('화살표로 옮긴 자리에서 Enter가 그 결과를 연다', async () => {
    const input = await openDialog();

    fireEvent.change(input, { target: { value: '터보' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith(postPath('turbo-b'));
  });

  // 결과가 통째로 갈렸는데 이전 선택이 남으면, 사용자가 보고 있던 것과 다른 글이
  // 열린다. 그래서 "이 선택이 어느 검색어의 것인가"를 함께 들고 판정한다.
  test('검색어를 바꾸면 선택이 첫 결과로 돌아간다', async () => {
    const input = await openDialog();

    fireEvent.change(input, { target: { value: '터보' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.change(input, { target: { value: '다른' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith(postPath('other'));
  });

  test('같은 검색어 안에서는 화살표가 위아래로 움직인다', async () => {
    const input = await openDialog();

    fireEvent.change(input, { target: { value: '터보' } });
    // 결과가 둘뿐이라 두 번째 ArrowDown은 끝에서 멈춘다.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith(postPath('turbo-a'));
  });
});
