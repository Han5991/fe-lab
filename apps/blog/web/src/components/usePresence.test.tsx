/**
 * 퇴장 전환이 끝날 때까지 마운트·값을 유지하는 훅.
 *
 * jsdom에는 Panda CSS가 없어 패널의 전환 시간이 0이다 — 그 경로(바로 닫힘)는 시트를 쓰는
 * 컴포넌트 테스트가 그대로 밟는다. 여기서는 패널에 인라인으로 전환을 줘서 브라우저 경로
 * (닫는 중 → transitionend → 닫힘, 이벤트를 놓쳤을 때의 백스톱)를 본다.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef, type CSSProperties } from 'react';
import { useHeldUntilExit, usePresence } from './usePresence';

const SHEET_TRANSITION: CSSProperties = {
  transitionProperty: 'opacity, transform',
  transitionDuration: '0.2s, 410ms',
  transitionDelay: '0s, 0s',
};

function Sheet({
  panelStyle,
  property = 'transform',
}: {
  panelStyle?: CSSProperties;
  property?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { state, open, close, closeNow } = usePresence(panelRef, property);
  return (
    <>
      <output>{state}</output>
      <button type="button" onClick={open}>
        열기
      </button>
      <button type="button" onClick={close}>
        닫기
      </button>
      <button type="button" onClick={closeNow}>
        바로 닫기
      </button>
      {state !== 'closed' && (
        <div ref={panelRef} role="dialog" aria-label="시트" style={panelStyle}>
          <p>안쪽</p>
        </div>
      )}
    </>
  );
}

/** jsdom에는 TransitionEvent가 없다 — 훅이 읽는 propertyName만 붙인다. */
const transitionEvent = (type: string, propertyName: string) => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  return event;
};

const state = () => screen.getByRole('status').textContent;
const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => {
  vi.useRealTimers();
});

describe('usePresence', () => {
  test('전환이 없으면 닫자마자 언마운트한다', () => {
    render(<Sheet />);
    click('열기');
    expect(screen.getByRole('dialog', { name: '시트' })).toBeInTheDocument();

    click('닫기');

    expect(state()).toBe('closed');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('transform 전환이 끝날 때까지 마운트를 유지한다 — 다른 속성·자식의 이벤트는 세지 않는다', () => {
    render(<Sheet panelStyle={SHEET_TRANSITION} />);
    click('열기');
    click('닫기');
    expect(state()).toBe('closing');

    const dialog = screen.getByRole('dialog', { name: '시트' });
    act(() => {
      dialog.dispatchEvent(transitionEvent('transitionend', 'opacity'));
      screen
        .getByText('안쪽')
        .dispatchEvent(transitionEvent('transitionend', 'transform'));
    });
    expect(state()).toBe('closing');

    act(() => {
      dialog.dispatchEvent(transitionEvent('transitionend', 'transform'));
    });
    expect(state()).toBe('closed');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('이벤트를 놓쳐도 계산된 시간 + 여유 뒤에 닫는다', () => {
    vi.useFakeTimers();
    render(<Sheet panelStyle={SHEET_TRANSITION} />);
    click('열기');
    click('닫기');

    // transform의 410ms만 센다(opacity의 0.2s가 아니라) — 여유 50ms까지는 닫는 중이다.
    act(() => {
      vi.advanceTimersByTime(459);
    });
    expect(state()).toBe('closing');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(state()).toBe('closed');
  });

  // 열리는 중에 닫으면 진행 중이던 열림 전환이 취소돼 transitioncancel이 온다. 그것은 퇴장의
  // 끝이 아니다 — 시트는 되돌아가는 동안 마운트돼 있어야 하고, 퇴장의 transitionend로만 닫힌다.
  test('닫는 중에 온 취소 이벤트는 퇴장의 끝이 아니다 — 시트는 transitionend까지 남는다', () => {
    render(<Sheet panelStyle={SHEET_TRANSITION} />);
    click('열기');
    click('닫기');
    const dialog = screen.getByRole('dialog', { name: '시트' });

    act(() => {
      dialog.dispatchEvent(transitionEvent('transitioncancel', 'transform'));
    });
    expect(state()).toBe('closing');
    expect(screen.getByRole('dialog', { name: '시트' })).toBe(dialog);

    act(() => {
      dialog.dispatchEvent(transitionEvent('transitionend', 'transform'));
    });
    expect(state()).toBe('closed');
  });

  test('닫는 중에 다시 열면 열린 채로 남는다 — 그 사이 도착한 취소 이벤트도 닫지 못한다', () => {
    render(<Sheet panelStyle={SHEET_TRANSITION} />);
    click('열기');
    click('닫기');
    const dialog = screen.getByRole('dialog', { name: '시트' });

    act(() => {
      click('열기');
      dialog.dispatchEvent(transitionEvent('transitioncancel', 'transform'));
    });

    expect(state()).toBe('open');
    expect(screen.getByRole('dialog', { name: '시트' })).toBe(dialog);
  });

  test('듣는 속성은 쓰는 쪽이 고른다 — clip-path 전환의 끝만 센다', () => {
    render(
      <Sheet
        property="clip-path"
        panelStyle={{
          transitionProperty: 'opacity, clip-path',
          transitionDuration: '0.2s, 175ms',
        }}
      />,
    );
    click('열기');
    click('닫기');
    const dialog = screen.getByRole('dialog', { name: '시트' });

    act(() => {
      dialog.dispatchEvent(transitionEvent('transitionend', 'transform'));
      dialog.dispatchEvent(transitionEvent('transitionend', 'opacity'));
    });
    expect(state()).toBe('closing');

    act(() => {
      dialog.dispatchEvent(transitionEvent('transitionend', 'clip-path'));
    });
    expect(state()).toBe('closed');
  });

  test('닫는 속성에 전환이 없으면 닫자마자 언마운트한다 — 다른 속성의 전환은 세지 않는다', () => {
    render(<Sheet property="clip-path" panelStyle={SHEET_TRANSITION} />);
    click('열기');
    click('닫기');

    expect(state()).toBe('closed');
  });

  test('바로 닫기는 퇴장 전환을 건너뛴다', () => {
    render(<Sheet panelStyle={SHEET_TRANSITION} />);
    click('열기');

    click('바로 닫기');

    expect(state()).toBe('closed');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const TRACK_TRANSITION: CSSProperties = {
  transitionProperty: 'opacity, grid-template-columns',
  transitionDuration: '0.2s, 410ms',
};

/** 트랙(전환하는 바깥 요소)과 그 안에서 붙든 값을 그리는 칼럼. */
function Column({
  value,
  trackStyle,
}: {
  value: string | null;
  trackStyle?: CSSProperties;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const held = useHeldUntilExit(value, trackRef, 'grid-template-columns');
  return (
    <div ref={trackRef} role="group" aria-label="트랙" style={trackStyle}>
      {held.value !== null && (
        <section aria-label="칼럼">
          <p>{held.value}</p>
        </section>
      )}
      <output>
        {[held.appeared ? '생김' : '', held.leaving ? '나가는 중' : ''].join(
          ' ',
        )}
      </output>
    </div>
  );
}

const shown = () => screen.queryByRole('region', { name: '칼럼' })?.textContent;
const flags = () => screen.getByRole('status').textContent.trim();

describe('useHeldUntilExit', () => {
  test('값이 사라져도 그 요소·그 속성의 전환이 끝날 때까지 직전 값을 붙든다', () => {
    const view = render(<Column value="a" trackStyle={TRACK_TRANSITION} />);
    view.rerender(<Column value={null} trackStyle={TRACK_TRANSITION} />);
    expect(shown()).toBe('a');
    expect(flags()).toBe('나가는 중');

    const track = screen.getByRole('group', { name: '트랙' });
    act(() => {
      track.dispatchEvent(transitionEvent('transitionend', 'opacity'));
      screen
        .getByText('a')
        .dispatchEvent(
          transitionEvent('transitionend', 'grid-template-columns'),
        );
      track.dispatchEvent(
        transitionEvent('transitioncancel', 'grid-template-columns'),
      );
    });
    expect(shown()).toBe('a');

    act(() => {
      track.dispatchEvent(
        transitionEvent('transitionend', 'grid-template-columns'),
      );
    });
    expect(shown()).toBeUndefined();
    expect(flags()).toBe('');
  });

  test('이벤트를 놓쳐도 계산된 시간 + 여유 뒤에 놓는다 — 전환이 없으면 여유만큼 뒤다', () => {
    vi.useFakeTimers();
    const view = render(<Column value="a" trackStyle={TRACK_TRANSITION} />);
    view.rerender(<Column value={null} trackStyle={TRACK_TRANSITION} />);

    // grid-template-columns의 410ms만 센다(opacity의 0.2s가 아니라).
    act(() => {
      vi.advanceTimersByTime(459);
    });
    expect(shown()).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(shown()).toBeUndefined();

    view.rerender(<Column value="b" />);
    view.rerender(<Column value={null} />);
    act(() => {
      vi.advanceTimersByTime(49);
    });
    expect(shown()).toBe('b');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(shown()).toBeUndefined();
  });

  test('빈 자리에 생긴 값만 생긴 것이다 — 처음 값·교체(닫히는 중의 교체 포함)는 아니다', () => {
    const view = render(<Column value="a" trackStyle={TRACK_TRANSITION} />);
    expect(flags()).toBe('');

    view.rerender(<Column value="b" trackStyle={TRACK_TRANSITION} />);
    expect(shown()).toBe('b');
    expect(flags()).toBe('');

    view.rerender(<Column value={null} trackStyle={TRACK_TRANSITION} />);
    view.rerender(<Column value="c" trackStyle={TRACK_TRANSITION} />);
    expect(shown()).toBe('c');
    expect(flags()).toBe('');

    view.rerender(<Column value={null} trackStyle={TRACK_TRANSITION} />);
    act(() => {
      screen
        .getByRole('group', { name: '트랙' })
        .dispatchEvent(
          transitionEvent('transitionend', 'grid-template-columns'),
        );
    });
    view.rerender(<Column value="d" trackStyle={TRACK_TRANSITION} />);
    expect(shown()).toBe('d');
    expect(flags()).toBe('생김');
  });

  test('닫히는 중에 같은 값이 다시 오면 그대로 이어 그리고, 퇴장의 백스톱이 놓지 않는다', () => {
    vi.useFakeTimers();
    const view = render(<Column value="a" trackStyle={TRACK_TRANSITION} />);
    view.rerender(<Column value={null} trackStyle={TRACK_TRANSITION} />);
    const column = screen.getByRole('region', { name: '칼럼' });

    view.rerender(<Column value="a" trackStyle={TRACK_TRANSITION} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole('region', { name: '칼럼' })).toBe(column);
    expect(flags()).toBe('');
  });
});
