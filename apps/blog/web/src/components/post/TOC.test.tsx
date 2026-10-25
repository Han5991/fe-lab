/**
 * 글 차례 — 깊이마다 꺾이는 레일 path, 보이는 절만 남기는 강조 레일, 들여쓰기, 클릭 처리.
 *
 * 레일 path는 화면으로는 "선이 조금 이상하다" 정도로만 보이고 어긋나도 아무것도 던지지 않는다. 특히
 * 단이 바뀌는 구간의 곡선은 **다음 항목 안쪽에 전부 들어가야** 하는데(경계에 걸치면 하이라이트가 한
 * 항목만 비출 때 곡선이 반토막 나 허공에 뜬다), 그 불변식은 눈으로 확인하기 어렵다. 여기서 좌표로
 * 고정한다. 항목의 실측(`getBoundingClientRect`)은 jsdom이 전부 0을 주므로 필요한 곳만 상자를 꾸민다.
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
import { TOC, buildPath, measureLengths, type Row } from './TOC';

/** 한 줄짜리 항목 하나. 높이 20px로 촘촘히 쌓는다. */
const row = (x: number, top: number, height = 20): Row => ({
  x,
  top,
  bottom: top + height,
});

/** path에서 곡선 명령(C)만 뽑는다. */
const curves = (d: string) => d.match(/C [^LC]+/g) ?? [];

describe('buildPath', () => {
  test('항목이 없으면 빈 문자열', () => {
    expect(buildPath([])).toBe('');
  });

  test('단이 같으면 세로선만 그린다', () => {
    const d = buildPath([row(8, 0), row(8, 20), row(8, 40)]);

    expect(curves(d)).toEqual([]);
    // 첫 항목의 머리(0)에서 마지막 항목의 바닥(60)까지 이어진다.
    expect(d.startsWith('M 8 0')).toBe(true);
    expect(d.endsWith('L 8 60')).toBe(true);
  });

  test('단이 바뀌면 곡선으로 갈아탄다', () => {
    const d = buildPath([row(8, 0), row(16, 20)]);

    expect(curves(d)).toHaveLength(1);
    // 끝점은 다음 항목의 x, 그리고 그 항목 **안쪽**이다.
    expect(d).toContain('16 28');
  });

  test('곡선은 전부 다음 항목 안에 들어간다', () => {
    // 항목 높이(20)의 절반이 ELBOW(8)보다 크므로 8px만 내려간다.
    const rows = [row(8, 0), row(16, 20)];
    const d = buildPath(rows);

    // 곡선의 세로 끝(C 명령의 마지막 좌표)이 다음 항목 구간 [20, 40) 안이다. 곡선이 없으면 빈 문자열
    // → NaN이 되어 아래 단언이 실패한다.
    const curve = curves(d)[0] ?? '';
    const end = Number(curve.trim().split(/\s+/).pop());
    expect(end).toBeGreaterThan(rows[1].top);
    expect(end).toBeLessThan(rows[1].bottom);
  });

  test('항목이 낮으면 곡선도 그만큼 짧아진다', () => {
    // 높이 10짜리 항목으로 갈아타면 절반인 5px만 쓴다(8px을 쓰면 그 항목을 넘어 다음 경계를 침범한다).
    const d = buildPath([row(8, 0), row(16, 20, 10)]);

    expect(d).toContain('16 25');
  });

  test('되돌아오는 단 변화도 곡선으로 잇는다', () => {
    // h2 → h3 → h2 처럼 들어갔다 나오는 흔한 모양.
    const d = buildPath([row(8, 0), row(16, 20), row(8, 40)]);

    expect(curves(d)).toHaveLength(2);
  });
});

describe('measureLengths', () => {
  test('getTotalLength가 없는 환경에서는 빈 배열을 준다', () => {
    // jsdom에는 SVG 기하 API가 없다. 여기서 던지면 차례 전체가 못 그려지고, 빈 배열이면 레일과
    // 하이라이트는 그대로 두고 점만 빠진다.
    expect(measureLengths('M 8 0 L 8 20', [row(8, 0)])).toEqual([]);
  });
});

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

  // 레일은 깊이마다 8씩 오른쪽(8 · 16 · 24)에 서고, 글자는 그 레일에서 한 칸(8) 더 띄운다.
  test('들여쓰기는 가장 얕은 헤딩이 16이고 레일과 함께 한 단계마다 8씩이다', () => {
    render(<TOC />);

    const padding = (name: string) =>
      screen.getByRole('link', { name }).style.paddingLeft;
    expect(padding('첫 절')).toBe('16px');
    expect(padding('하위 절')).toBe('24px');
    expect(padding('더 깊은 절')).toBe('32px');
    expect(padding('둘째 절')).toBe('16px');
  });

  test('레일과 점은 장식이라 스크린리더에서 숨긴다', () => {
    render(<TOC />);

    const nav = screen.getByRole('navigation', { name: '이 글의 차례' });
    const decor = nav.querySelectorAll(':scope > div > div[aria-hidden]');
    expect(decor.length).toBeGreaterThanOrEqual(1);
    for (const el of decor) expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  // 강조 레일은 같은 path를 clip-path로 잘라 보이는 절만 남긴다 — 위는 첫 항목의 머리, 아래는 마지막
  // 항목의 바닥이다. 값은 항목의 실측이라 jsdom에서는 상자를 꾸며 줘야 나온다.
  test('강조 레일은 보이는 절의 위·아래로 잘린다', async () => {
    // 헤딩 상자가 전부 0이라 활성 구간은 마지막 항목(둘째 절) 하나다 — 그 항목의 위(60)에서 자른다.
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
      // 두 번째 path가 강조 레일이다(첫째는 흐린 전체 레일).
      const lit = () => nav.querySelectorAll<SVGPathElement>('path')[1];
      await waitFor(() =>
        expect(lit()?.style.clipPath).toMatch(/^inset\(60px 0px /),
      );
      // 첫째 path는 자르지 않는다 — 전체 레일이 늘 바닥에 깔린다.
      expect(nav.querySelectorAll('path')[0]?.getAttribute('style')).toBeNull();
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
