/**
 * 글 차례 — 곧은 트랙과 보이는 절을 덮는 막대, 깊이에 따른 들여쓰기, 클릭 처리.
 *
 * 막대의 위치는 항목의 실측(`getBoundingClientRect`)에서 나오는데 jsdom은 전부 0을 준다 — 위치 값
 * 자체는 브라우저(e2e·화면 대조)가 보고, 여기서는 "있어야 할 때 있고 없어야 할 때 없다"와 들여쓰기·
 * 이름 계약을 잠근다.
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
import { render, screen, waitFor } from '@testing-library/react';
import { TOC } from './TOC';

/** 차례가 읽어 가는 본문. 헤딩 하나당 (id, 레벨, 글)이다. */
const mountContent = (
  headings: { id: string; level: 2 | 3 | 4; text: string }[],
) => {
  const content = document.createElement('div');
  content.id = 'post-content';
  for (const { id, level, text } of headings) {
    const h = document.createElement(`h${level}`);
    h.id = id;
    h.textContent = text;
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

  test('들여쓰기는 가장 얕은 헤딩이 12이고 한 단계마다 16씩이다', () => {
    render(<TOC />);

    const padding = (name: string) =>
      screen.getByRole('link', { name }).style.paddingLeft;
    expect(padding('첫 절')).toBe('12px');
    expect(padding('하위 절')).toBe('28px');
    expect(padding('더 깊은 절')).toBe('44px');
    expect(padding('둘째 절')).toBe('12px');
  });

  test('트랙과 막대는 장식이라 스크린리더에서 숨긴다', () => {
    render(<TOC />);

    const nav = screen.getByRole('navigation', { name: '이 글의 차례' });
    const decor = nav.querySelectorAll(':scope > div > div[aria-hidden]');
    expect(decor.length).toBeGreaterThanOrEqual(1);
    for (const el of decor) expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  // 막대는 합성 전용 transform으로만 움직인다 — 위치는 translateY, 길이는 scaleY다. top·height를
  // 전환하면 프레임마다 레이아웃이 돈다. 값은 항목의 실측이라 jsdom에서는 상자를 꾸며 줘야 나온다.
  test('막대의 위치와 길이는 transform으로 놓이고 top·height는 쓰지 않는다', async () => {
    // 헤딩 상자가 전부 0이라 활성 구간은 마지막 항목(둘째 절) 하나다 — 그 항목의 위·아래가 막대가 된다.
    const rect = vi
      .spyOn(HTMLLIElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const [top, bottom] =
          this.textContent === '둘째 절' ? [60, 100] : [0, 20];
        return new DOMRect(0, top, 100, bottom - top);
      });
    try {
      render(<TOC />);

      const nav = screen.getByRole('navigation', { name: '이 글의 차례' });
      // 막대는 실측과 활성 구간이 정해진 뒤에야 그려진다(두 번째 장식 요소).
      const bar = () =>
        nav.querySelectorAll<HTMLElement>(':scope > div > div[aria-hidden]')[1];
      await waitFor(() =>
        expect(bar()?.style.transform).toBe('translateY(60px) scaleY(40)'),
      );
      expect(bar()?.style.top).toBe('');
      expect(bar()?.style.height).toBe('');
    } finally {
      rect.mockRestore();
    }
  });

  test('헤딩이 없으면 아무것도 그리지 않는다', () => {
    document.body.replaceChildren();
    mountContent([]);
    const { container } = render(<TOC />);

    expect(container).toBeEmptyDOMElement();
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
