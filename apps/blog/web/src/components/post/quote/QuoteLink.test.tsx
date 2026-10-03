/**
 * 문장 공유 링크 버튼 — 본문 안의 선택에만 뜨고, 누르면 그 문장으로 열리는
 * 링크를 복사한다. 조각을 못 만들면 섹션 링크로 물러난다. 생성기와 클립보드는
 * 주입한다(실제 생성기는 fragmentGenerator.test.ts가 따로 본다).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QuoteLink } from './QuoteLink';
import type { FragmentGenerator } from './fragmentGenerator';

const ARTICLE = `
  <p id="intro">첫 헤딩보다 앞에 있는 도입 문단이다.</p>
  <h2 id="why">왜 바꿨나</h2>
  <p id="first">빌드가 4분 걸렸다. 그래서 나눴다.</p>
  <h2 id="result">결과</h2>
  <p id="second">CI에서는 매 실행 25초씩 줄었다.</p>
`;

/** 선택 범위가 화면에서 차지하는 자리(jsdom은 레이아웃이 없어 흉내 낸다). */
let rect = { top: 300, bottom: 320, left: 100, width: 200, height: 20 };
let content: HTMLElement;

beforeEach(() => {
  rect = { top: 300, bottom: 320, left: 100, width: 200, height: 20 };
  vi.stubGlobal('innerWidth', 1200);
  vi.stubGlobal('innerHeight', 800);
  Range.prototype.getBoundingClientRect = () =>
    ({ ...rect, right: rect.left + rect.width }) as DOMRect;

  content = document.createElement('div');
  content.id = 'post-content';
  content.innerHTML = ARTICLE;
  document.body.append(content);
});

afterEach(() => {
  document.getSelection()?.removeAllRanges();
  content.remove();
  vi.unstubAllGlobals();
});

/** 요소의 글자를 선택하고 selectionchange를 알린다. */
const select = (node: Node) => {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
};

const clearSelection = () => {
  document.getSelection()?.removeAllRanges();
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
};

const textOf = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} 없음`);
  return el;
};

interface Setup {
  generate?: FragmentGenerator;
  write?: (text: string) => Promise<void>;
}

const renderQuote = ({
  generate = () => ({ textStart: '25초씩 줄었다' }),
  write = () => Promise.resolve(),
}: Setup = {}) => {
  const loadGenerator = vi.fn(() => Promise.resolve(generate));
  const writeClipboard = vi.fn(write);
  render(
    <QuoteLink loadGenerator={loadGenerator} writeClipboard={writeClipboard} />,
  );
  return { loadGenerator, writeClipboard };
};

const findButton = () => screen.findByRole('button', { name: '링크 복사' });

describe('QuoteLink 버튼', () => {
  test('선택이 없으면 버튼이 없다', () => {
    renderQuote();

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('본문 문장을 선택하면 선택 위에 버튼이 뜬다', async () => {
    renderQuote();

    select(textOf('second'));
    const button = await findButton();

    // 선택 위 8px, 버튼 높이 36px — 선택의 가로 중앙.
    expect(button).toHaveStyle({ top: `${300 - 8 - 36}px`, left: '200px' });
  });

  test('위에 자리가 없으면 선택 아래에 뜬다', async () => {
    rect = { ...rect, top: 70, bottom: 90 };
    renderQuote();

    select(textOf('second'));

    expect(await findButton()).toHaveStyle({ top: `${90 + 8}px` });
  });

  test('터치로 바뀐 뒤의 선택은 OS 메뉴를 피해 선택 아래에 뜬다', async () => {
    renderQuote();
    // 마운트 뒤에 입력이 터치로 바뀐다(터치스크린 노트북 같은 겸용 기기).
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(pointer: coarse)',
    }));

    select(textOf('second'));

    expect(await findButton()).toHaveStyle({ top: `${320 + 8}px` });
  });

  test('본문 밖의 선택에는 뜨지 않는다', async () => {
    const outside = document.createElement('p');
    outside.textContent = '사이드바 글자';
    document.body.append(outside);
    renderQuote();

    select(outside);
    await act(() => new Promise(resolve => setTimeout(resolve, 200)));

    expect(screen.queryByRole('button')).toBeNull();
    outside.remove();
  });

  test('선택을 풀면 버튼이 사라진다', async () => {
    renderQuote();
    select(textOf('second'));
    await findButton();

    clearSelection();

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('마우스로 끄는 동안에는 띄우지 않고, 놓으면 띄운다', async () => {
    renderQuote();

    fireEvent.pointerDown(document, { pointerType: 'mouse' });
    select(textOf('second'));
    await act(() => new Promise(resolve => setTimeout(resolve, 200)));
    expect(screen.queryByRole('button')).toBeNull();

    fireEvent.pointerUp(document, { pointerType: 'mouse' });

    expect(await findButton()).toBeVisible();
  });

  test('Esc를 누르면 버튼을 거둔다', async () => {
    renderQuote();
    select(textOf('second'));
    await findButton();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('생성기는 선택했을 때 미리 받고, 한 번만 받는다', async () => {
    const { loadGenerator } = renderQuote();

    select(textOf('first'));
    await findButton();
    select(textOf('second'));
    await findButton();

    expect(loadGenerator).toHaveBeenCalledTimes(1);
  });
});

describe('QuoteLink 복사', () => {
  test('그 문장으로 열리는 링크(#:~:text=)를 복사하고 알린다', async () => {
    const { writeClipboard } = renderQuote();
    select(textOf('second'));

    fireEvent.click(await findButton());

    expect(
      await screen.findByRole('button', { name: '링크를 복사했어요' }),
    ).toBeVisible();
    expect(writeClipboard).toHaveBeenCalledWith(
      `${window.location.origin}${window.location.pathname}#:~:text=${encodeURIComponent('25초씩 줄었다')}`,
    );
    // 스크린리더에도 결과를 알린다.
    expect(
      screen.getByText('링크를 복사했어요', { selector: 'p' }),
    ).toBeInTheDocument();
  });

  test('조각을 못 만들면 선택이 속한 섹션의 링크를 대신 복사한다', async () => {
    const { writeClipboard } = renderQuote({ generate: () => null });
    select(textOf('second'));

    fireEvent.click(await findButton());

    expect(
      await screen.findByRole('button', { name: '섹션 링크를 복사했어요' }),
    ).toBeVisible();
    expect(writeClipboard).toHaveBeenCalledWith(
      `${window.location.origin}${window.location.pathname}#result`,
    );
  });

  test('헤딩보다 앞(도입부)이면 섹션이 아니라 글 링크라고 알린다', async () => {
    const { writeClipboard } = renderQuote({ generate: () => null });
    select(textOf('intro'));

    fireEvent.click(await findButton());

    expect(
      await screen.findByRole('button', { name: '글 링크를 복사했어요' }),
    ).toBeVisible();
    expect(writeClipboard).toHaveBeenCalledWith(
      `${window.location.origin}${window.location.pathname}`,
    );
  });

  test('클립보드가 거절하면 실패를 알린다', async () => {
    renderQuote({ write: () => Promise.reject(new Error('denied')) });
    select(textOf('second'));

    fireEvent.click(await findButton());

    expect(
      await screen.findByRole('button', { name: '복사하지 못했어요' }),
    ).toBeVisible();
  });

  test('누르는 순간 선택이 풀리지 않게 한다', async () => {
    renderQuote();
    select(textOf('second'));
    const button = await findButton();

    const allowed = fireEvent.mouseDown(button);

    expect(allowed).toBe(false);
  });

  test('버튼을 누르느라 선택이 풀려도(터치) 버튼이 남아 복사된다', async () => {
    const { writeClipboard } = renderQuote();
    select(textOf('second'));
    const button = await findButton();

    fireEvent.pointerDown(button, { pointerType: 'touch' });
    clearSelection();
    fireEvent.click(button);

    expect(
      await screen.findByRole('button', { name: '링크를 복사했어요' }),
    ).toBeVisible();
    expect(writeClipboard).toHaveBeenCalledTimes(1);
  });

  test('결과를 잠깐 보여 준 뒤 버튼을 거둔다', async () => {
    renderQuote();
    select(textOf('second'));
    fireEvent.click(await findButton());
    await screen.findByRole('button', { name: '링크를 복사했어요' });

    await waitFor(() => expect(screen.queryByRole('button')).toBeNull(), {
      timeout: 2500,
    });
  });
});

describe('QuoteLink 포커스', () => {
  /**
   * 키보드 사용자의 흐름 — 어딘가에 포커스를 둔 채 문장을 고르고, Tab으로
   * 버튼에 온다. 포커스를 옮기면 선택이 풀리는 브라우저(jsdom 포함)가 있다.
   */
  const tabToButton = async () => {
    const origin = document.createElement('a');
    origin.href = '#why';
    origin.textContent = '차례: 왜 바꿨나';
    document.body.append(origin);
    act(() => origin.focus());
    select(textOf('second'));
    const button = await findButton();
    act(() => button.focus());
    return { origin, button };
  };

  test('버튼으로 포커스를 옮기느라 선택이 풀려도 버튼은 남는다', async () => {
    renderQuote();
    const { origin, button } = await tabToButton();

    await act(() => new Promise(resolve => setTimeout(resolve, 200)));

    expect(button).toBeInTheDocument();
    expect(button).toHaveFocus();
    origin.remove();
  });

  test('복사하지 않고 버튼을 떠나면(선택도 풀렸으면) 버튼을 거둔다', async () => {
    renderQuote();
    const { origin } = await tabToButton();

    act(() => origin.focus());

    expect(screen.queryByRole('button')).toBeNull();
    origin.remove();
  });

  test('Tab으로 온 버튼이 복사 뒤 사라지면 포커스를 원래 자리로 돌려준다', async () => {
    renderQuote();
    const { origin, button } = await tabToButton();

    fireEvent.click(button);
    await screen.findByRole('button', { name: '링크를 복사했어요' });
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull(), {
      timeout: 2500,
    });

    expect(origin).toHaveFocus();
    origin.remove();
  });

  test('Esc로 거둘 때도 포커스를 원래 자리로 돌려준다', async () => {
    renderQuote();
    const { origin, button } = await tabToButton();

    fireEvent.keyDown(button, { key: 'Escape' });

    expect(screen.queryByRole('button')).toBeNull();
    expect(origin).toHaveFocus();
    origin.remove();
  });
});
