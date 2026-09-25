/**
 * 검색 다이얼로그의 **선택 인덱스 계약**과 **다이얼로그 접근성 계약.**
 *
 * 선택 인덱스는 "어느 검색어에 대한 선택인지"를 함께 들고 다닌다. 예전에는
 * query가 바뀔 때마다 effect가 0으로 되돌렸는데, 그러면 렌더 → effect → 리렌더가
 * 한 번 더 돌고 그 사이 한 프레임 동안 이전 검색어의 인덱스가 새 결과 위에
 * 얹힌다. 되돌리는 주체가 effect에서 렌더 중 판정으로 바뀌었으므로, 겉으로
 * 드러나는 계약 — 화살표로 옮긴 자리에서 Enter가 그 결과를 열고, 검색어를 바꾸면
 * 선택이 첫 결과로 돌아간다 — 을 여기서 고정한다.
 */
import { beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const post = (slug: string, title: string, series: string | null = null) => ({
  slug,
  title,
  date: '2026-01-01',
  excerpt: '',
  tags: [],
  series,
});

// 색인에는 시리즈 id(폴더 경로)만 있다 — 화면은 이 표로 제목을 찾는다.
const SERIES_TITLES = { 'lab/error-handling': '우아한 에러 처리' };

// '터보'로 거르면 앞의 둘만 남는다 — 화살표가 움직일 자리가 있어야 한다.
const POSTS = [
  post('turbo-a', '터보 첫 글'),
  post('turbo-b', '터보 둘째 글'),
  post('other', '전혀 다른 글', 'lab/error-handling'),
];

/** 다이얼로그를 열고 검색 인덱스가 도착할 때까지 기다린 뒤 입력창을 준다. */
const openDialog = async () => {
  render(<SearchDialog seriesTitles={SERIES_TITLES} />);
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  // 검색 인덱스는 열릴 때 fetch로 불러온다.
  await screen.findByText('터보 첫 글');
  return screen.getByRole('combobox', { name: '검색어' });
};

beforeEach(() => {
  push.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(POSTS) }),
    ),
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

  // 한글 조합 중의 Enter는 조합을 끝내는 키다 — 결과를 열면 안 된다.
  test('IME 조합 중의 Enter는 결과를 열지 않는다', async () => {
    const input = await openDialog();

    fireEvent.change(input, { target: { value: '터보' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(push).not.toHaveBeenCalled();
  });
});

// 다이얼로그는 sticky 헤더 안에서 렌더되는데, 헤더의 backdrop-filter가 fixed
// 자손의 containing block을 헤더로 바꿔 모바일 풀스크린 패널이 52px로 접혔다.
// jsdom은 레이아웃을 하지 않으니 원인 쪽 — 오버레이가 헤더 밖(body)에 붙는지 — 을 잠근다.
describe('SearchDialog - 오버레이 위치', () => {
  test('헤더 안에서 열어도 다이얼로그는 헤더 바깥(body)에 뜬다', async () => {
    const { container } = render(
      <header>
        <SearchDialog seriesTitles={SERIES_TITLES} />
      </header>,
    );
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    await screen.findByText('터보 첫 글');
    const dialog = screen.getByRole('dialog', { name: '글 검색' });

    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });
});

describe('SearchDialog - 다이얼로그 접근성', () => {
  test('모달 다이얼로그로 열리고 입력창에 초점이 간다', async () => {
    const input = await openDialog();

    const dialog = screen.getByRole('dialog', { name: '글 검색' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(input).toHaveFocus());
  });

  test('닫기 버튼은 이름이 있고, 닫으면 초점이 트리거로 돌아간다', async () => {
    await openDialog();
    const trigger = screen.getByRole('button', { name: '검색' });
    trigger.focus();

    fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('Escape로 닫히고 초점이 트리거로 돌아간다', async () => {
    render(<SearchDialog seriesTitles={SERIES_TITLES} />);
    const trigger = screen.getByRole('button', { name: '검색' });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByText('터보 첫 글');

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('Tab은 다이얼로그 안에서 돈다', async () => {
    const input = await openDialog();
    const close = screen.getByRole('button', { name: '검색 닫기' });

    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });

  test('화살표 선택이 콤보박스의 activedescendant로 전해진다', async () => {
    const input = await openDialog();

    fireEvent.change(input, { target: { value: '터보' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const selected = screen.getByRole('option', { selected: true });
    expect(selected).toHaveTextContent('터보 둘째 글');
    expect(input).toHaveAttribute('aria-activedescendant', selected.id);
    expect(screen.getByRole('listbox')).toHaveAttribute(
      'id',
      input.getAttribute('aria-controls'),
    );
  });

  test('결과는 글 주소로 가는 링크다', async () => {
    await openDialog();

    const option = screen.getByRole('option', { name: /터보 첫 글/ });
    expect(option.querySelector('a')).toHaveAttribute(
      'href',
      postPath('turbo-a'),
    );
  });
});

describe('SearchDialog - 시리즈 표기', () => {
  test('결과에 시리즈 id가 아니라 제목을 보이고, 제목으로도 찾힌다', async () => {
    const input = await openDialog();

    fireEvent.change(input, { target: { value: '우아한' } });

    const option = screen.getByRole('option', { name: /전혀 다른 글/ });
    expect(option).toHaveTextContent('우아한 에러 처리');
    expect(option).not.toHaveTextContent('lab/error-handling');
  });
});

describe('SearchDialog - 검색 색인 불러오기', () => {
  const okResponse = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(POSTS) });

  test('응답이 오기 전에 닫았다 다시 열어도 색인은 한 번만 요청한다', async () => {
    let respond: (value: unknown) => void = () => undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise(resolve => {
          respond = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<SearchDialog seriesTitles={SERIES_TITLES} />);
    const trigger = screen.getByRole('button', { name: '검색' });

    fireEvent.click(trigger);
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
    fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));
    fireEvent.click(trigger);
    respond({ ok: true, json: () => Promise.resolve(POSTS) });

    await screen.findByText('터보 첫 글');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // 예전엔 res.ok를 보지 않아 실패가 콘솔에만 남고, 다이얼로그는 "검색 결과가
  // 없습니다"인 채로 영영 비어 있었다.
  test('실패하면 알리고, 다시 시도로 새로 받는다', async () => {
    const quiet = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    onTestFinished(() => quiet.mockRestore());
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockImplementation(okResponse);
    vi.stubGlobal('fetch', fetchMock);
    render(<SearchDialog seriesTitles={SERIES_TITLES} />);
    fireEvent.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '불러오지 못했습니다',
    );
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('터보 첫 글')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
