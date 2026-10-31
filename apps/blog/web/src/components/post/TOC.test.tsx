/**
 * 글 차례 — 들여쓰기, 활성 구간을 덮는 면(clip-path), 제목 안 코드 칩, 클릭 처리.
 *
 * 면의 위치는 항목 실측(`getBoundingClientRect`)에서 나오는데 jsdom은 전부 0을 주므로 필요한 곳만
 * 값을 꾸민다(`fakeLayout`).
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { TOC } from './TOC';

/** 차례가 읽어 가는 본문. 헤딩 하나당 (id, 레벨, 글)이다. */
const mountContent = (
  headings: { id: string; level: 2 | 3 | 4; text: string; html?: string }[],
) => {
  const content = document.createElement('div');
  content.id = 'post-content';
  for (const { id, level, text, html } of headings) {
    const h = document.createElement(`h${level}`);
    h.id = id;
    if (html === undefined) h.textContent = text;
    else h.innerHTML = html;
    content.appendChild(h);
  }
  document.body.appendChild(content);
};

/** jsdom에 없는 것들 — 없으면 TOC가 마운트되다 던진다. */
const stubResizeObserver = () =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        // 관측 콜백을 검사하지 않으므로 기록만 안 하면 된다
      }
      disconnect() {
        // observe가 아무것도 안 하므로 해제할 것도 없다
      }
    },
  );

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('TOC 구조', () => {
  beforeEach(() => {
    mountContent([
      { id: 'a', level: 2, text: '첫 절' },
      { id: 'b', level: 3, text: '하위 절' },
      { id: 'c', level: 4, text: '더 깊은 절' },
      { id: 'd', level: 2, text: '둘째 절' },
    ]);
    stubResizeObserver();
  });

  test('이름이 "이 글의 차례"인 내비게이션 안의 목록이다', () => {
    render(<TOC />);

    const nav = screen.getByRole('navigation', { name: '이 글의 차례' });
    expect(nav.querySelectorAll('li')).toHaveLength(4);
  });

  // fumadocs `block` 차례와 같은 값 — h2 8 · h3 20 · h4 32.
  test('들여쓰기는 h2가 8, h3가 20, h4가 32다', () => {
    render(<TOC />);

    const padding = (name: string) =>
      screen.getByRole('link', { name }).style.paddingLeft;
    expect(padding('첫 절')).toBe('8px');
    expect(padding('하위 절')).toBe('20px');
    expect(padding('더 깊은 절')).toBe('32px');
    expect(padding('둘째 절')).toBe('8px');
  });

  test('활성 구간을 덮는 면은 장식이라 스크린리더에서 숨긴다', () => {
    render(<TOC />);

    const nav = screen.getByRole('navigation', { name: '이 글의 차례' });
    const decor = nav.querySelectorAll(':scope > div > div[aria-hidden]');
    expect(decor).toHaveLength(1);
    expect(decor[0]).toHaveAttribute('aria-hidden', 'true');
  });

  test('제목 안 인라인 코드는 차례에서도 코드로 그린다', () => {
    document.body.replaceChildren();
    mountContent([
      {
        id: 'paths',
        level: 3,
        text: '',
        html: '<code>paths</code>도 끝이 아니다',
      },
    ]);
    render(<TOC />);

    const link = screen.getByRole('link', { name: 'paths도 끝이 아니다' });
    expect(link.querySelector('code')).toHaveTextContent(/^paths$/);
  });

  test('헤딩이 없으면 아무것도 그리지 않는다', () => {
    document.body.replaceChildren();
    mountContent([]);
    const { container } = render(<TOC />);

    expect(container).toBeEmptyDOMElement();
  });
});

/** 차례 상자의 꾸민 배치 — column 높이와 항목 글자별 [위, 아래](column 기준). 높이 0은 숨은 상태다. */
interface FakeLayout {
  height: number;
  rows: Record<string, [number, number]>;
}

/**
 * jsdom은 레이아웃이 없어 `getBoundingClientRect`가 전부 0이다. 차례의 column과 항목만 `state`대로 꾸민다
 * (헤딩은 0 그대로 — 그래서 활성 구간은 마지막 항목 하나다). `state`를 고치고 크기 변화를 흘리면 다시 잰다.
 */
const fakeLayout = (state: FakeLayout) =>
  vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      const nav = this.closest('nav[aria-label="이 글의 차례"]');
      if (nav === null) return new DOMRect(0, 0, 0, 0);
      if (this.parentElement === nav)
        return new DOMRect(0, 0, 268, state.height);
      if (this.tagName !== 'A' || state.height === 0)
        return new DOMRect(0, 0, 0, 0);
      const [top, bottom] = state.rows[this.textContent] ?? [0, 20];
      return new DOMRect(0, top, 268, bottom - top);
    });

/** 크기 변화를 손으로 흘릴 수 있는 ResizeObserver — 콜백을 잡아 둔다. */
const captureResizeObserver = () => {
  const callbacks: (() => void)[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe() {
        // 관측은 테스트가 resize()로 대신한다
      }
      disconnect() {
        // 잡아 둔 콜백만 있으니 해제할 것이 없다
      }
    },
  );
  return () =>
    act(() => {
      for (const callback of callbacks) callback();
    });
};

/**
 * 면 요소와, 그 위에서 일어난 속성 변화의 순서(clip-path를 쓴 `style` → 전환을 켠 `data-ready`).
 * MutationObserver는 기록을 나중에 넘기므로 `changes()`가 쌓인 기록을 그 자리에서 거둬 읽는다.
 */
const watchBlock = () => {
  const nav = screen.getByRole('navigation', { name: '이 글의 차례' });
  const block = nav.querySelector<HTMLElement>('div[aria-hidden]');
  if (block === null) throw new Error('면 요소가 없다');
  const seen: (string | null)[] = [];
  const observer = new MutationObserver(records => {
    for (const record of records) seen.push(record.attributeName);
  });
  observer.observe(block, { attributes: true });
  const changes = () => {
    for (const record of observer.takeRecords())
      seen.push(record.attributeName);
    return [...seen];
  };
  const reset = () => {
    changes();
    seen.length = 0;
  };
  return { block, changes, reset };
};

describe('TOC 활성 구간 면', () => {
  const ROWS: FakeLayout['rows'] = {
    '첫 절': [0, 20],
    '하위 절': [20, 40],
    '둘째 절': [60, 80],
  };

  beforeEach(() => {
    mountContent([
      { id: 'a', level: 2, text: '첫 절' },
      { id: 'b', level: 3, text: '하위 절' },
      { id: 'd', level: 2, text: '둘째 절' },
    ]);
  });

  // 면은 목록 전체를 덮고 clip-path로 활성 구간만 남긴다 — 위는 첫 항목의 머리, 아래는 마지막 항목의 바닥.
  test('면은 활성 구간의 위·아래로 잘린다', async () => {
    captureResizeObserver();
    const rect = fakeLayout({ height: 100, rows: ROWS });
    try {
      render(<TOC />);
      const { block } = watchBlock();

      // 활성 구간은 마지막 항목(둘째 절) 하나 — 위 60, 아래는 목록 높이 100 - 항목 바닥 80 = 20.
      await waitFor(() =>
        expect(block.style.clipPath).toMatch(/^inset\(60px 0px 20px round /),
      );
    } finally {
      rect.mockRestore();
    }
  });

  // 전환을 켠 채 첫 값을 넣으면 접힌 상태에서 펼쳐지는 움직임이 하드 로드마다 재생된다. 그래서 첫 자리를
  // 쓴 **뒤에** 전환(data-ready)을 켠다. 활성 구간이 오기 전에는 켜지 않는다.
  test('첫 자리는 전환 없이 잡는다 — clip-path를 쓴 뒤에 data-ready가 선다', async () => {
    captureResizeObserver();
    const rect = fakeLayout({ height: 100, rows: ROWS });
    try {
      render(<TOC />);
      const { block, changes } = watchBlock();
      expect(block).not.toHaveAttribute('data-ready');

      await waitFor(() => expect(block).toHaveAttribute('data-ready'));
      expect(changes()).toEqual(['style', 'data-ready']);
    } finally {
      rect.mockRestore();
    }
  });

  test('크기가 바뀌면 다시 재고 면을 옮긴다', async () => {
    const resize = captureResizeObserver();
    const state: FakeLayout = { height: 100, rows: { ...ROWS } };
    const rect = fakeLayout(state);
    try {
      render(<TOC />);
      const { block } = watchBlock();
      await waitFor(() => expect(block).toHaveAttribute('data-ready'));

      // 폭이 줄어 위 항목들이 두 줄로 접혔다 — 마지막 항목이 100~140으로 내려간다.
      state.height = 200;
      state.rows = { ...ROWS, '둘째 절': [100, 140] };
      resize();

      expect(block.style.clipPath).toMatch(/^inset\(100px 0px 60px round /);
    } finally {
      rect.mockRestore();
    }
  });

  // lg 미만에서 차례는 display:none이라 전부 0으로 잰다. 그 값으로 그리면 면이 목록 전체를 덮은 채 남고,
  // 다시 보일 때 거기서부터 쓸려 내려왔다(태블릿 회전·창 크기 조절).
  test('숨은 동안은 그리지 않고, 다시 보이면 전환 없이 제자리를 잡는다', async () => {
    const resize = captureResizeObserver();
    const state: FakeLayout = { height: 100, rows: { ...ROWS } };
    const rect = fakeLayout(state);
    try {
      render(<TOC />);
      const { block, changes, reset } = watchBlock();
      await waitFor(() => expect(block).toHaveAttribute('data-ready'));
      const shown = block.style.clipPath;

      state.height = 0;
      resize();
      expect(block).not.toHaveAttribute('data-ready');
      // 숨은 동안 0 좌표로 다시 그리지 않는다(목록 전체를 덮는 inset(0px …)이 남지 않게).
      expect(block.style.clipPath).toBe(shown);

      // 숨은 사이 폭이 바뀌어 항목이 내려갔다. 다시 보이는 첫 측정은 전환이 꺼진 채 새 자리를 쓰고,
      // 그다음에 전환을 켠다 — 숨기 전 자리에서 미끄러져 오지 않는다.
      reset();
      state.height = 200;
      state.rows = { ...ROWS, '둘째 절': [100, 140] };
      resize();

      expect(block.style.clipPath).toMatch(/^inset\(100px 0px 60px round /);
      expect(changes()).toEqual(['style', 'data-ready']);
    } finally {
      rect.mockRestore();
    }
  });

  test('숨은 채로 열리면 면을 그리지 않는다', async () => {
    captureResizeObserver();
    const rect = fakeLayout({ height: 0, rows: ROWS });
    try {
      render(<TOC />);
      const { block } = watchBlock();
      // 활성 구간이 정해질 때까지 기다린다(현재 항목이 표시되면 계산이 끝난 것이다).
      await waitFor(() =>
        expect(screen.getByRole('link', { name: '둘째 절' })).toHaveAttribute(
          'aria-current',
          'true',
        ),
      );

      expect(block.style.clipPath).toBe('');
      expect(block).not.toHaveAttribute('data-ready');
    } finally {
      rect.mockRestore();
    }
  });
});

/**
 * 항목을 클릭했을 때 브라우저에게 무엇을 남기는가.
 *
 * 차례 항목은 `<button>`이 아니라 `<a href="#...">`인데, 그 이유의 절반은
 * **새 탭으로 열기**다. 그런데 스크롤을 직접 처리하려고 `preventDefault()`를
 * 무조건 부르면 Cmd/Ctrl+클릭까지 함께 막혀 앵커로 바꾼 의미가 사라진다.
 * 화면으로는 "그냥 스크롤됐네"로만 보여서 알아채기 어려운 회귀라 여기서 막는다.
 */
describe('TOC 항목 클릭', () => {
  // 메서드를 직접 단언하면 unbound-method에 걸려 헤딩에 심은 mock을 변수로 든다.
  let scrollIntoViewMock: Mock<Element['scrollIntoView']>;

  const dispatchClick = (el: Element, init: MouseEventInit = {}) => {
    const ev = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...init,
    });
    el.dispatchEvent(ev);
    return ev;
  };

  beforeEach(() => {
    const content = document.createElement('div');
    content.id = 'post-content';
    const h = document.createElement('h2');
    h.id = 'intro';
    h.textContent = '들어가며';
    scrollIntoViewMock = vi.fn<Element['scrollIntoView']>();
    h.scrollIntoView = scrollIntoViewMock;
    content.appendChild(h);
    document.body.appendChild(content);

    // jsdom에 없는 것들 — 없으면 TOC가 마운트되다 던진다.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {
          // 관측 콜백을 검사하지 않으므로 기록만 안 하면 된다
        }
        disconnect() {
          // observe가 아무것도 안 하므로 해제할 것도 없다
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  test('평범한 클릭은 가로채서 우리가 직접 스크롤한다', () => {
    // 해시는 기록을 쌓지 않고 바꾼다(replaceState) — 기본 앵커 이동은 쌓는다.
    render(<TOC />);

    const ev = dispatchClick(screen.getByRole('link', { name: '들어가며' }));

    expect(ev.defaultPrevented).toBe(true);
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  test.each([
    ['meta', { metaKey: true }],
    ['ctrl', { ctrlKey: true }],
    ['shift', { shiftKey: true }],
  ])('%s 키를 누른 클릭은 브라우저에 맡긴다', (_name, init) => {
    // 여기서 기본 동작을 막으면 새 탭·새 창이 열리지 않는다.
    render(<TOC />);

    const ev = dispatchClick(
      screen.getByRole('link', { name: '들어가며' }),
      init,
    );

    expect(ev.defaultPrevented).toBe(false);
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
