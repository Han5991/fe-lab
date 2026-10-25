/**
 * 읽기 진행 바 — 스크롤 프레임이 아니라 표지(sentinel)가 화면 위 끝의 선을 넘을 때만 갱신한다.
 *
 * jsdom에는 IntersectionObserver·ResizeObserver가 없고 레이아웃도 없다. 그래서 관찰자를 가짜로 바꿔
 * "몇 번째 표지가 선에 걸렸다"는 알림을 직접 보내고, 바가 그 수만큼 늘어나는지와 관찰 계약(위 끝의 선,
 * 표지 수)을 본다. 표지가 실제로 제자리에 서는지는 브라우저 실측(빌드한 글 상세, PR 본문)이 본다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { PROGRESS_STEPS, ReadingProgress } from './ReadingProgress';

interface FakeObserver {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  targets: Element[];
}

let observers: FakeObserver[] = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly record: FakeObserver;
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        this.record = { callback, options, targets: [] };
        observers.push(this.record);
      }
      observe(target: Element) {
        this.record.targets.push(target);
      }
      disconnect() {
        this.record.targets = [];
      }
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        // 문서 높이 변화는 이 테스트가 보지 않는다
      }
      disconnect() {
        // observe가 아무것도 안 하므로 해제할 것도 없다
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** 진행 바의 채움 막대 — 헤더 아래 고정 띠의 자식. */
const fill = () =>
  document.querySelector<HTMLElement>(
    'div[aria-hidden="true"][style*="--site-header-height"] > div',
  );

/** 앞에서부터 `count`개 표지가 선에 걸렸다(나머지는 아니다)고 알린다. */
const report = (observer: FakeObserver, count: number) => {
  const entries = observer.targets.map((target, i) => ({
    target,
    isIntersecting: i < count,
  }));
  act(() => {
    observer.callback(
      // 이 컴포넌트가 읽는 필드(target·isIntersecting)만 채운 가짜 항목이다.
      entries as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
  });
};

describe('ReadingProgress', () => {
  test('스크롤 거리를 100칸으로 나눈 표지를 화면 위 끝의 선(높이 0)에 대고 본다', () => {
    render(<ReadingProgress />);

    expect(observers).toHaveLength(1);
    const [observer] = observers;
    expect(observer?.targets).toHaveLength(PROGRESS_STEPS);
    // 아래로 -100%면 root는 화면 위 끝의 높이 0인 선이다 — "지났다"가 곧 "걸려 있다"가 된다.
    expect(observer?.options?.rootMargin).toBe('0px 0px -100% 0px');
    // 표지는 장식이다.
    expect(observer?.targets[0]?.parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  test('선에 걸린 표지 수만큼 바가 차고, 거슬러 오르면 다시 준다', () => {
    render(<ReadingProgress />);
    const [observer] = observers;
    if (!observer) throw new Error('관찰자가 없다');

    report(observer, 30);
    expect(fill()?.style.transform).toBe('scaleX(0.3)');

    // 한 번에 끝까지 건너뛰어도(맨 아래로) 100칸이 다 찬다.
    report(observer, PROGRESS_STEPS);
    expect(fill()?.style.transform).toBe('scaleX(1)');

    report(observer, 12);
    expect(fill()?.style.transform).toBe('scaleX(0.12)');
  });

  test('언마운트하면 관찰을 끊는다', () => {
    const { unmount } = render(<ReadingProgress />);
    unmount();

    expect(observers[0]?.targets).toEqual([]);
  });
});
